from django.contrib import admin
from .models import Employee, Vehicle, DetectedPlate, Camera, Department

# Register your models here.

# Проста реєстрація
admin.site.register(Employee)
admin.site.register(Vehicle)
admin.site.register(DetectedPlate)
admin.site.register(Camera)
admin.site.register(Department)