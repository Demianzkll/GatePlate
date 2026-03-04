from django.urls import path, include
from .views import (
    DetectedPlateListView,
    AnalysisStartView,
    LiveUpdateView,
    PlateConfirmView,
    EmployeeListCreateView,
    EmployeeDetailView,
    DepartmentListView,
    VehicleViewSet,
    GuestVehicleCreateView
)
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'vehicles', VehicleViewSet)

urlpatterns = [
    path('detected-plates/', DetectedPlateListView.as_view(), name='plates-api'),
    path('start-analysis/', AnalysisStartView.as_view(), name='start-analysis'),
    path('live-update/', LiveUpdateView.as_view(), name='live-update'),
    path('confirm-plate/', PlateConfirmView.as_view(), name='confirm-plate'),
    path('employees/', EmployeeListCreateView.as_view(), name='employees-list'),
    path('employees/<int:pk>/', EmployeeDetailView.as_view(), name='employee-detail'),
    path('departments/', DepartmentListView.as_view(), name='department-list'),
    path('guest/register/', GuestVehicleCreateView.as_view(), name='guest-vehicle-register'), # Додай це!
    path('', include(router.urls)),
]
