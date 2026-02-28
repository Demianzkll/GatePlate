from django.urls import path, include
from .views import (
    DetectedPlateListView,
    AnalysisStartView,
    LiveUpdateView,
    PlateConfirmView,
    EmployeeListCreateView,
    EmployeeDetailView,
    DepartmentListView,
    VehicleViewSet
)
from rest_framework.routers import DefaultRouter


router = DefaultRouter()
router.register(r'vehicles', VehicleViewSet)

urlpatterns = [
    # Історія розпізнавань
    path('detected-plates/', DetectedPlateListView.as_view(), name='plates-api'),
    
    # Керування VisionEngine
    path('start-analysis/', AnalysisStartView.as_view(), name='start-analysis'),
    path('live-update/', LiveUpdateView.as_view(), name='live-update'),
    path('confirm-plate/', PlateConfirmView.as_view(), name='confirm-plate'),
    
    # Працівники: Отримання списку та Створення (POST)
    path('employees/', EmployeeListCreateView.as_view(), name='employees-list'),
    
    # Працівники: Отримання одного, Оновлення (PUT) та Видалення (DELETE) за ID
    path('employees/<int:pk>/', EmployeeDetailView.as_view(), name='employee-detail'),
    path('departments/', DepartmentListView.as_view(), name='department-list'),
    path('', include(router.urls)),
]
