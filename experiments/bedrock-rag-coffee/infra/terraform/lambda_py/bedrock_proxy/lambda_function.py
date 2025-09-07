import json
import os
import base64
import boto3
from botocore.exceptions import ClientError


def _arn_region(arn: str | None) -> str | None:
    """Extract region from an ARN (arn:partition:service:region:account:resource)."""
    if not arn or not isinstance(arn, str):
        return None
    try:
        parts = arn.split(":", 5)
        if len(parts) >= 5 and parts[0] == "arn":
            return parts[3] or None
    except Exception:
        pass
    return None


def _invoke_bedrock(bedrock, *, body_bytes: bytes, model_id: str | None, inference_profile_arn: str | None):
    """Invoke Bedrock Runtime with backward compatibility.
    - If the SDK supports `inferenceProfileArn`, use it.
    - Otherwise (older SDKs), pass the profile ARN via `modelId`.
    """
    kwargs = {
        'contentType': 'application/json',
        'accept': 'application/json',
        'body': body_bytes,
    }

    # Detect support for `inferenceProfileArn` in this client's model
    supports_ip = False
    try:
        op = bedrock.meta.service_model.operation_model('InvokeModel')
        supports_ip = 'inferenceProfileArn' in (op.input_shape.members or {})
    except Exception:
        supports_ip = False

    if inference_profile_arn:
        if supports_ip:
            kwargs['inferenceProfileArn'] = inference_profile_arn
        else:
            # Fallback for older botocore/boto3: put the profile ARN into modelId
            kwargs['modelId'] = inference_profile_arn
    else:
        kwargs['modelId'] = model_id

    return bedrock.invoke_model(**kwargs)


def _find_inference_profile_for_model(bedrock_ctl, model_id: str | None) -> str | None:
    if not model_id:
        return None
    try:
        token = None
        while True:
            kwargs = {}
            if token:
                kwargs['nextToken'] = token
            res = bedrock_ctl.list_inference_profiles(**kwargs)
            for p in res.get('inferenceProfileSummaries', []):
                model_arn = (p.get('modelArn') or '')
                # Foundation model ARN commonly ends with the model ID
                if model_arn.endswith(model_id):
                    return p.get('inferenceProfileArn')
                # Some regions return empty modelArn; fallback to name/ARN substring match
                if not model_arn:
                    prof_arn = (p.get('inferenceProfileArn') or '').lower()
                    prof_name = (p.get('inferenceProfileName') or '').lower()
                    mid_lower = model_id.lower()
                    if (mid_lower in prof_arn) or (mid_lower in prof_name):
                        return p.get('inferenceProfileArn')
            token = res.get('nextToken')
            if not token:
                break
    except Exception:
        pass
    return None


def _invoke_with_auto_profile(bedrock, bedrock_ctl, *, body_bytes: bytes, model_id: str | None, inference_profile_arn: str | None):
    # If profile provided, use it (SDK will prefer inferenceProfileArn; fallback handled inside _invoke_bedrock)
    if inference_profile_arn:
        return _invoke_bedrock(bedrock, body_bytes=body_bytes, model_id=model_id, inference_profile_arn=inference_profile_arn)
    # Try direct by model ID first
    try:
        return _invoke_bedrock(bedrock, body_bytes=body_bytes, model_id=model_id, inference_profile_arn=None)
    except ClientError as e:
        # Normalize error information
        err = getattr(e, 'response', {}).get('Error', {}) if hasattr(e, 'response') else {}
        code = (err.get('Code') or '').strip()
        msg = (err.get('Message') or str(e) or '').strip()

        def _contains(s: str) -> bool:
            return s in msg or s in msg.replace('\u2019', "'")

        # Conditions that should trigger a fallback to inference profile
        should_fallback = (
            _contains("on-demand throughput isn't supported") or
            _contains('on-demand throughput isn\u2019t supported') or
            _contains('on-demand throughput isn’t supported') or
            code == 'AccessDeniedException' or
            'don\'t have access to the model' in msg.lower() or
            'not authorized to perform bedrock:InvokeModel on resource' in msg.lower()
        )

        if should_fallback:
            prof = _find_inference_profile_for_model(bedrock_ctl, model_id)
            if prof:
                print(f"fallback_to_inference_profile: {prof}")
                return _invoke_bedrock(
                    bedrock,
                    body_bytes=body_bytes,
                    model_id=None,
                    inference_profile_arn=prof,
                )
        # No suitable fallback -> re-raise original
        raise


def _normalize_alias(s: str) -> str:
    return (s or '').strip().lower().replace(' ', '').replace('_', '').replace('/', '').replace('claude', 'claude')


def _resolve_model_id_by_alias(bedrock_ctl, alias: str | None) -> str | None:
    if not alias:
        return None
    a = _normalize_alias(alias)
    # Accept forms like: claude3.7, claude-3.7, claude-3-7, with optional suffix "sonnet" or "haiku"
    want_major_minor = '3-7'
    want_track = None
    if 'sonnet' in a:
        want_track = 'sonnet'
    elif 'haiku' in a:
        want_track = 'haiku'
    # Build candidates from foundation models
    try:
        # list_foundation_models may paginate in future; currently single page suffices
        res = bedrock_ctl.list_foundation_models()
        cands = []
        for m in res.get('modelSummaries', []):
            mid = (m.get('modelId') or '')
            lid = mid.lower()
            if not lid.startswith('anthropic.claude-'):
                continue
            if f'claude-{want_major_minor}' not in lid and f'claude{want_major_minor}' not in lid:
                continue
            if want_track and want_track not in lid:
                continue
            cands.append(mid)
        if not cands:
            return None
        # Prefer latest by lexical order (IDs often include date; later is greater)
        cands.sort(reverse=True)
        return cands[0]
    except Exception:
        return None


def _resolve_embedding_model_id(alias: str | None) -> str:
    """
    Resolve a friendly alias to an embedding modelId.
    Defaults to Titan v2 (1024-dim) which matches many pgvector setups.
    Known:
      - 'titan-v2-1024' -> amazon.titan-embed-text-v2:0
      - 'titan-v1-1536' -> amazon.titan-embed-text-v1
    """
    a = _normalize_alias(alias or '')
    if a in ('titanv21024', 'titan-v2-1024', 'titanv2', 'titan2'):
        return 'amazon.titan-embed-text-v2:0'
    if a in ('titanv11536', 'titan-v1-1536', 'titanv1', 'titan1'):
        return 'amazon.titan-embed-text-v1'
    # Fallback
    return 'amazon.titan-embed-text-v2:0'



# Deep fallback for text extraction
def _deep_first_text(obj, limit_nodes: int = 5000) -> str:
    """Recursively search for the first plausible text field in a nested payload.
    Looks for keys named 'text', 'outputText', 'completion', 'generated_text'.
    Caps traversal to avoid pathological payloads.
    """
    stack = [obj]
    visited = 0
    while stack and visited < limit_nodes:
        cur = stack.pop()
        visited += 1
        if isinstance(cur, dict):
            # Direct text-like fields first
            for k in ('text', 'outputText', 'completion', 'generated_text'):
                v = cur.get(k)
                if isinstance(v, str) and v.strip():
                    return v
            # Otherwise traverse values
            for v in cur.values():
                if isinstance(v, (dict, list)):
                    stack.append(v)
        elif isinstance(cur, list):
            for v in cur:
                if isinstance(v, (dict, list)):
                    stack.append(v)
    return ''

def _extract_text_from_bedrock_response(data: dict) -> str:
    """Best-effort extraction for different Bedrock payload shapes.
    Supports Anthropic Messages, Converse-wrapped outputs, and generic keys.
    """
    if not isinstance(data, dict):
        return ''

    # 1) Anthropic Messages API (InvokeModel)
    try:
        content = data.get('content')
        if isinstance(content, list) and content:
            parts = []
            for c in content:
                if isinstance(c, dict):
                    if c.get('type') == 'text' and isinstance(c.get('text'), str):
                        parts.append(c['text'])
                    # some SDKs may nest {type:'output_text', text:'...'}
                    elif isinstance(c.get('text'), str):
                        parts.append(c['text'])
            if parts:
                return "\n".join(parts)
    except Exception:
        pass

    # 2) Converse-style wrapper sometimes seen via profiles
    try:
        output = data.get('output')
        if isinstance(output, dict):
            msg = output.get('message') or output.get('messages')
            if isinstance(msg, dict):
                cont = msg.get('content')
                if isinstance(cont, list):
                    parts = []
                    for c in cont:
                        if isinstance(c, dict) and isinstance(c.get('text'), str):
                            parts.append(c['text'])
                    if parts:
                        return "\n".join(parts)
            elif isinstance(msg, list) and msg:
                # messages[0].content[0].text
                cont = msg[0].get('content') if isinstance(msg[0], dict) else None
                if isinstance(cont, list) and cont and isinstance(cont[0], dict) and isinstance(cont[0].get('text'), str):
                    return cont[0]['text']
    except Exception:
        pass

    # 3) Generic fallbacks (Titan/Text-style)
    for key in ('outputText', 'completion', 'generated_text', 'text'):
        val = data.get(key)
        if isinstance(val, str) and val:
            return val

    # 4) Deep search as the last resort
    deep = _deep_first_text(data)
    if deep:
        return deep

    return ''


def _parse_body(event):
    body = event.get('body')
    if not body:
        return {}
    if event.get('isBase64Encoded'):
        body = base64.b64decode(body).decode('utf-8')
    try:
        return json.loads(body)
    except Exception:
        return {}


def _resp(status, obj):
    return {
        'statusCode': status,
        'headers': {'content-type': 'application/json'},
        'body': json.dumps(obj, ensure_ascii=False),
    }


# Plain text response helper
def _resp_text(status: int, text: str):
    return {
        'statusCode': status,
        'headers': {'content-type': 'text/plain; charset=utf-8'},
        'body': text or '',
    }


def handler(event, context):
    try:
        action = None
        payload = _parse_body(event)
        action = (payload.get('action') or 'generate').lower()

        # Default clients (Lambda region)
        default_region = os.environ.get('AWS_REGION') or os.environ.get('AWS_DEFAULT_REGION')
        bedrock = boto3.client('bedrock-runtime', region_name=default_region)
        bedrock_ctl = boto3.client('bedrock', region_name=default_region)

        if action == 'embed':
            text = payload.get('text')
            if not text:
                return _resp(400, {'error': 'text required'})
            # Allow override from payload
            model_id = (payload.get('modelId')
                        or os.environ.get('EMBEDDING_MODEL_ID'))
            inference_profile_arn = (payload.get('inferenceProfileArn')
                                     or os.environ.get('EMBEDDING_INFERENCE_PROFILE_ARN'))
            # If nothing specified, choose a sensible default embedding model (no profile needed)
            if not model_id and not inference_profile_arn:
                emb_alias = (payload.get('embeddingModelAlias')
                             or os.environ.get('DEFAULT_EMBEDDING_ALIAS')
                             or 'titan-v2-1024')
                model_id = _resolve_embedding_model_id(emb_alias)
            body = json.dumps({'inputText': text})
            # Determine target region from explicit payload or provided ARN if any
            target_region = (payload.get('region')
                             or _arn_region(payload.get('inferenceProfileArn') or os.environ.get('EMBEDDING_INFERENCE_PROFILE_ARN')))
            if target_region and target_region != default_region:
                bedrock = boto3.client('bedrock-runtime', region_name=target_region)
                bedrock_ctl = boto3.client('bedrock', region_name=target_region)
            res = _invoke_with_auto_profile(
                bedrock,
                bedrock_ctl,
                body_bytes=body.encode('utf-8'),
                model_id=model_id,
                inference_profile_arn=inference_profile_arn,
            )
            data = json.loads(res['body'].read())
            return _resp(200, {'embedding': data.get('embedding')})

        if action == 'generate':
            user_text = payload.get('userText')
            if not user_text:
                return _resp(400, {'error': 'userText required'})
            system = payload.get('system') or 'You are a helpful assistant.'
            max_tokens = int(payload.get('maxTokens') or 800)
            # If region explicitly provided, set clients before any discovery
            requested_region = payload.get('region')
            if requested_region and requested_region != default_region:
                bedrock = boto3.client('bedrock-runtime', region_name=requested_region)
                bedrock_ctl = boto3.client('bedrock', region_name=requested_region)

            inference_profile_arn = (payload.get('inferenceProfileArn')
                                     or os.environ.get('GENERATION_INFERENCE_PROFILE_ARN'))

            # modelId resolution priority:
            # 1) payload.modelId
            # 2) payload.modelAlias
            # 3) env.GENERATION_MODEL_ID
            # 4) DEFAULT alias fallback ('claude-3.7-sonnet')
            model_id = payload.get('modelId')

            if not model_id:
                alias = payload.get('modelAlias')
                if alias:
                    model_id = _resolve_model_id_by_alias(bedrock_ctl, alias)

            if not model_id:
                model_id = os.environ.get('GENERATION_MODEL_ID')

            if not model_id and not inference_profile_arn:
                default_alias = os.environ.get('DEFAULT_GENERATION_ALIAS') or 'claude-3.7-sonnet'
                model_id = _resolve_model_id_by_alias(bedrock_ctl, default_alias)

            # Determine target region from explicit payload or provided ARN if any
            target_region = requested_region or _arn_region(inference_profile_arn)
            if not target_region:
                # If modelId is an ARN, honor its region
                target_region = _arn_region(model_id)
            if target_region and target_region != default_region:
                bedrock = boto3.client('bedrock-runtime', region_name=target_region)
                bedrock_ctl = boto3.client('bedrock', region_name=target_region)
            # Follow Bedrock Claude Messages API format
            body = json.dumps({
                'anthropic_version': 'bedrock-2023-05-31',
                'system': system,
                'max_tokens': max_tokens,
                'messages': [
                    {
                        'role': 'user',
                        'content': [{'type': 'text', 'text': user_text}],
                    }
                ],
            })
            res = _invoke_with_auto_profile(
                bedrock,
                bedrock_ctl,
                body_bytes=body.encode('utf-8'),
                model_id=model_id,
                inference_profile_arn=inference_profile_arn,
            )
            raw_bytes = res['body'].read()
            data = json.loads(raw_bytes)
            text = _extract_text_from_bedrock_response(data)
            try:
                # Log only lightweight summary to CloudWatch for diagnostics
                print("bedrock_resp_keys:", list(data.keys())[:10])
                if 'content' in data and isinstance(data['content'], list):
                    print("content_item_types:", [type(x) for x in data['content'][:3]])
                if 'output' in data:
                    print("has_output_wrapper=True")
            except Exception:
                pass
            # Decide response format: default to plain text unless explicitly asking JSON
            accept_hdr = ''
            try:
                hdrs = event.get('headers') or {}
                accept_hdr = (hdrs.get('accept') or hdrs.get('Accept') or '').lower()
            except Exception:
                pass
            want_json = bool(payload.get('json')) or ('application/json' in accept_hdr)

            if want_json:
                return _resp(200, {'text': text or None, 'raw': data})
            else:
                return _resp_text(200, text or '')

        if action == 'models':
            list_region = payload.get('region')
            if list_region and list_region != (os.environ.get('AWS_REGION') or os.environ.get('AWS_DEFAULT_REGION')):
                bedrock_ctl = boto3.client('bedrock', region_name=list_region)
            res = bedrock_ctl.list_foundation_models()
            ids = [m.get('modelId') for m in res.get('modelSummaries', [])]
            return _resp(200, {'models': ids})

        if action == 'profiles':
            # Optionally filter by substring across multiple fields
            # Backward compatible keys: modelContains/modelIdContains
            # New keys: profileContains/nameContains
            contains = (
                payload.get('modelContains')
                or payload.get('modelIdContains')
                or payload.get('profileContains')
                or payload.get('nameContains')
                or ''
            ).lower().strip()
            # Allow explicit region override for listing
            list_region = payload.get('region')
            if list_region and list_region != (os.environ.get('AWS_REGION') or os.environ.get('AWS_DEFAULT_REGION')):
                bedrock_ctl = boto3.client('bedrock', region_name=list_region)
            # list_inference_profiles may be paginated
            profiles = []
            token = None
            while True:
                kwargs = {}
                if token:
                    kwargs['nextToken'] = token
                res = bedrock_ctl.list_inference_profiles(**kwargs)
                items = res.get('inferenceProfileSummaries', [])
                for p in items:
                    model_arn = p.get('modelArn', '') or ''
                    profile_arn = p.get('inferenceProfileArn', '') or ''
                    name = p.get('inferenceProfileName', '') or ''
                    # Some regions return empty modelArn. Build a combined haystack.
                    haystack = ' '.join([model_arn, profile_arn, name]).lower()
                    if contains and contains not in haystack:
                        continue
                    profiles.append({
                        'inferenceProfileArn': p.get('inferenceProfileArn'),
                        'modelArn': model_arn,
                        'name': p.get('inferenceProfileName'),
                        'status': p.get('status'),
                    })
                token = res.get('nextToken')
                if not token:
                    break
            return _resp(200, {'profiles': profiles})

        return _resp(400, {'error': 'unsupported action'})

    except Exception as e:
        import traceback
        print("Exception:", e)
        traceback.print_exc()
        # Try to surface Bedrock client errors
        try:
            from botocore.exceptions import ClientError, ParamValidationError, BotoCoreError
            if isinstance(e, ParamValidationError):
                return _resp(400, {'error': 'ParamValidationError', 'message': str(e)})
            if isinstance(e, ClientError):
                code = e.response.get('Error', {}).get('Code')
                msg = e.response.get('Error', {}).get('Message')
                return _resp(400, {'error': code, 'message': msg})
            if isinstance(e, BotoCoreError):
                return _resp(400, {'error': 'BotoCoreError', 'message': str(e)})
        except Exception:
            pass
        return _resp(500, {'message': 'Internal Server Error'})
