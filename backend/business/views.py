import logging

from django.db import DatabaseError, connection
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .models import CompanyMember
from .supabase_auth import authenticate_supabase_request

logger = logging.getLogger(__name__)


@require_GET
def health_check(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except DatabaseError:
        logger.exception("Database health check failed")
        return JsonResponse(
            {"status": "unavailable", "database": "unavailable"},
            status=503,
        )

    return JsonResponse({"status": "ok", "database": "ok"})


@require_GET
def current_user(request):
    user_id, email, error_response = authenticate_supabase_request(request)
    if error_response:
        return error_response

    memberships = (
        CompanyMember.objects.filter(supabase_user_id=user_id, active=True)
        .select_related("company")
        .order_by("company__name")
    )
    return JsonResponse(
        {
            "id": str(user_id),
            "email": email,
            "companies": [
                {
                    "id": str(member.company_id),
                    "name": member.company.name,
                    "role": member.role,
                }
                for member in memberships
            ],
        }
    )
