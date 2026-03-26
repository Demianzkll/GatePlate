import threading
import time
from datetime import timedelta

from django.contrib.auth.models import User

from rest_framework import generics, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from scripts.vision_engine import VisionEngine

from .models import (
    APIKey,
    BlackList,
    Camera,
    Department,
    DetectedPlate,
    Employee,
    UserProfile,
    Vehicle,
)
from .serializers import (
    DepartmentSerializer,
    DetectedPlateSerializer,
    EmployeeSerializer,
    UserSerializer,
    VehicleSerializer,
)

# Глобальні сховища
active_analyzers = {}
live_previews = {}
temp_best_frames = {}


class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        # 1. Перевіряємо логін і пароль
        serializer = self.serializer_class(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        # 2. Отримуємо або створюємо токен
        token, created = Token.objects.get_or_create(user=user)

        # 3. ДІЗНАЄМОСЯ РОЛЬ (ГРУПУ) КОРИСТУВАЧА
        user_role = "Guest"  # За замовчуванням
        if user.groups.exists():
            user_role = (
                user.groups.first().name
            )  # Беремо назву першої групи (напр. 'Operators')

        # 4. Відправляємо React-у розширену відповідь!
        return Response(
            {
                "token": token.key,
                "user_id": user.pk,
                "username": user.username,
                "role": user_role,
            }
        )


# --- ПРАВА ДОСТУПУ (PERMISSIONS) ---


class IsStaffUser(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return (
            request.user.is_staff
            or request.user.groups.filter(
                name__in=["Administrators", "Operators"]
            ).exists()
        )


# --- AUTH VIEWS ---


class RegisterUserView(generics.CreateAPIView):
    """Реєстрація нового гостя"""

    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]

    serializer_class = UserSerializer


# --- VISION ENGINE VIEWS ---


class AnalysisStartView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        video_name = request.query_params.get("video", "")
        if video_name and video_name not in active_analyzers:
            engine = VisionEngine(
                video_name=video_name,
                live_dict=live_previews,
                cache_dict=temp_best_frames,
            )
            thread = threading.Thread(target=engine.run)
            thread.daemon = True
            active_analyzers[video_name] = thread
            thread.start()

            def cleanup():
                thread.join()
                active_analyzers.pop(video_name, None)

            threading.Thread(target=cleanup).start()
            return Response({"status": "VisionEngine started"})
        return Response({"status": "Already running"})


class LiveUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        video_name = request.query_params.get("video", "")
        data = live_previews.get(video_name)
        if data and data.get("is_finished"):

            def delayed_clear():
                time.sleep(5)
                live_previews.pop(video_name, None)

            threading.Thread(target=delayed_clear).start()
        return Response(data)


class PlateConfirmView(APIView):
    permission_classes = [IsStaffUser]

    def post(self, request):
        data = request.data
        plate_text = data.get("plate")
        video_name = data.get("video_name")
        temp_data = temp_best_frames.get(video_name)

        if not temp_data:
            return Response(
                {"error": "No cached data found"}, status=status.HTTP_400_BAD_REQUEST
            )

        camera_obj, _ = Camera.objects.get_or_create(name=f"Камера: {video_name}")

        vehicle_obj = Vehicle.objects.filter(plate_text=plate_text).first()

        new_record = DetectedPlate.objects.create(
            camera=camera_obj,
            plate_text=plate_text,
            confidence=temp_data.get("conf", 0.0),
            vehicle=vehicle_obj,
        )

        if "image_content" in temp_data:
            new_record.image.save(
                f"{plate_text}_manual.jpg", temp_data["image_content"], save=True
            )

        live_previews.pop(video_name, None)
        temp_best_frames.pop(video_name, None)

        return Response({"status": "saved"})


# --- EMPLOYEE CRUD VIEWS ---


class EmployeeListCreateView(generics.ListCreateAPIView):
    queryset = Employee.objects.all().order_by("-id")
    serializer_class = EmployeeSerializer
    permission_classes = [IsStaffUser]


class EmployeeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsStaffUser]


# --- DEPARTMENT VIEWS ---


class DepartmentListView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        departments = Department.objects.all()
        serializer = DepartmentSerializer(departments, many=True)
        return Response(serializer.data)


# --- DETECTED PLATES VIEW ---


class DetectedPlateListView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        plates = DetectedPlate.objects.all().order_by("-timestamp")[:10]
        serializer = DetectedPlateSerializer(plates, many=True)
        return Response(serializer.data)


# --- VEHICLE VIEWS ---


class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer

    def get_permissions(self):
        if self.action == "check_plate":
            return [permissions.IsAuthenticated()]
        return [IsStaffUser()]

    @action(detail=False, methods=["get"])
    def check_plate(self, request):
        plate = request.query_params.get("plate", "").upper().strip()
        if not plate:
            return Response(
                {"error": "Номер не вказано"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            vehicle = Vehicle.objects.get(plate_text=plate)
            serializer = self.get_serializer(vehicle)
            return Response(
                {
                    "access": True,
                    "message": "АВТОПРОПУСК ДОЗВОЛЕНО",
                    "data": serializer.data,
                }
            )
        except Vehicle.DoesNotExist:
            return Response(
                {"access": False, "message": "ОБ'ЄКТ НЕ ЗНАЙДЕНО", "data": None},
                status=status.HTTP_404_NOT_FOUND,
            )


class GuestVehicleCreateView(generics.CreateAPIView):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user

        serializer.save(
            created_by=user,
            owner_first_name=user.first_name or user.username,
            owner_last_name=user.last_name or "",
        )


class VehicleStatusUpdateView(APIView):
    permission_classes = [IsStaffUser]

    def post(self, request):
        plate = request.data.get("plate")
        action_type = request.data.get("action")
        if action_type == "to_black":
            BlackList.objects.get_or_create(plate_text=plate)
            return Response({"status": "blocked"})
        elif action_type == "to_white":
            BlackList.objects.filter(plate_text=plate).delete()
            return Response({"status": "unblocked"})
        return Response({"error": "Invalid action"}, status=400)


class IssueAPIKeyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        plan = request.data.get("plan")
        durations = {
            "1_month": 30,
            "3_months": 90,
            "1_year": 365,
        }
        days = durations.get(plan)
        if not days:
            return Response(
                {"error": "Невірний тариф"}, status=status.HTTP_400_BAD_REQUEST
            )

        from django.utils.timezone import now

        expires = now() + timedelta(days=days)

        api_key = APIKey.objects.create(
            user=request.user,
            expires_at=expires,
            plan=plan,
        )

        return Response(
            {
                "api_key": str(api_key.key),
                "expires_at": api_key.expires_at.isoformat(),
                "plan": plan,
            }
        )


class PhotoRecognitionAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        user = request.user
        image_file = request.FILES.get("car_image")

        if not image_file:
            return Response({"error": "Файл не завантажено"}, status=400)

        is_staff = user.groups.filter(name__in=["Administrators", "Operators"]).exists()

        from django.utils.timezone import now

        has_active_key = APIKey.objects.filter(
            user=user, is_active=True, expires_at__gt=now()
        ).exists()

        if not is_staff and not has_active_key:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            if profile.free_recognitions_used >= 1:
                return Response(
                    {"limit_reached": True, "message": "Безкоштовний ліміт вичерпано"}
                )

        engine = VisionEngine()

        analysis = engine.analyze_single_photo(image_file, save_to_archive=is_staff)

        if not is_staff and not has_active_key:
            profile.free_recognitions_used += 1
            profile.save()

        if not is_staff:
            return Response(
                {
                    "plate_text": analysis.get("plate_text"),
                    "confidence": analysis.get("confidence"),
                    "is_known": analysis.get("is_known"),
                    "owner_name": None,
                    "owner_phone": None,
                }
            )

        return Response(analysis)
