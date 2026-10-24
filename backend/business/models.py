import uuid

from django.db import models

# Create your models here.
class Company(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = "companies"
        
        def __str__(self):
            return self.name
        
class CompanyMember(models.Model):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Administrateur"
        MANAGER = "MANAGER", "Gestionnaire"
        ACCOUNTANT = "ACCOUNTANT", "Comptable"
        EMPLOYEE = "EMPLOYEE", "Employé"
        
    company = models.ForeignKey(
        Company, 
        on_delete = models.CASCADE, 
        related_name="members",
    )
    supabase_user_id = models.UUIDField()
    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
        
    class Meta:
        db_table = "company_members"
        constraints = [
            models.UniqueConstraint(
                fields=["company", "supabase_user_id"],
                name="unique_company_supabase_member",
            ),
        ]
            
        def __str__(self):
            return f"{self.name} - {self.company.name}"