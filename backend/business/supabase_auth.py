import json
import logging
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import UUID

from django.conf import settings
from django.http import HttpRequest, JsonResponse

logger = logging.getLogger(__name__)


def authenticate_supabase_request(
    request: HttpRequest,
) -> tuple[UUID | None, str | None, JsonResponse | None]:
    authorization = request.headers.get("Authorization", "")
    scheme, separator, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not separator or not token.strip():
        return None, None, JsonResponse(
            {"detail": "Un jeton Bearer Supabase est requis."},
            status=401,
        )

    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        return None, None, JsonResponse(
            {"detail": "L’authentification Supabase n’est pas configurée sur le serveur."},
            status=503,
        )

    auth_request = Request(
        f"{settings.SUPABASE_URL}/auth/v1/user",
        headers={
            "apikey": settings.SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {token.strip()}",
        },
        method="GET",
    )

    try:
        with urlopen(auth_request, timeout=5) as response:
            user_data = json.loads(response.read(1_048_576))
    except HTTPError as error:
        if error.code in (400, 401, 403):
            return None, None, JsonResponse(
                {"detail": "Le jeton Supabase est invalide ou expiré."},
                status=401,
            )
        logger.warning("Supabase Auth returned HTTP %s while validating a token.", error.code)
        return None, None, JsonResponse(
            {"detail": "Le service d’authentification est temporairement indisponible."},
            status=502,
        )
    except (URLError, TimeoutError, json.JSONDecodeError, UnicodeDecodeError):
        logger.exception("Unable to validate the access token with Supabase Auth.")
        return None, None, JsonResponse(
            {"detail": "Impossible de vérifier le jeton auprès de Supabase Auth."},
            status=502,
        )

    if not isinstance(user_data, dict):
        logger.error("Supabase Auth returned an unexpected user response.")
        return None, None, JsonResponse(
            {"detail": "Réponse invalide du service d’authentification."},
            status=502,
        )

    try:
        user_id = UUID(user_data["id"])
    except (KeyError, TypeError, ValueError):
        logger.error("Supabase Auth returned a user without a valid UUID.")
        return None, None, JsonResponse(
            {"detail": "Réponse invalide du service d’authentification."},
            status=502,
        )

    email = user_data.get("email")
    return user_id, email if isinstance(email, str) else None, None
