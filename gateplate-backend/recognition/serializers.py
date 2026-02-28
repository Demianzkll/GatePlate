from rest_framework import serializers
from .models import Employee, Vehicle, DetectedPlate, Camera, Department

class EmployeeSerializer(serializers.ModelSerializer):
    has_details = serializers.SerializerMethodField()
    root_department = serializers.CharField(source='department.parent.name', default=None)
    specific_department = serializers.CharField(source='department.name', default=None)

    class Meta:
        model = Employee
        fields = '__all__'

    def get_has_details(self, obj):
        # Якщо у відділу є батько, значить це "специфічний відділ" і треба показувати деталі
        return obj.department and obj.department.parent is not None
    


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'parent']

class VehicleSerializer(serializers.ModelSerializer):
    employee = EmployeeSerializer(read_only=True)
    class Meta:
        model = Vehicle
        fields = ['plate_text', 'brand_model', 'employee']


class DetectedPlateSerializer(serializers.ModelSerializer):
    vehicle = VehicleSerializer(read_only=True)
    camera_name = serializers.CharField(source='camera.name', read_only=True)

    class Meta:
        model = DetectedPlate
        fields = ['id', 'plate_text', 'timestamp', 'confidence', 'vehicle', 'camera_name']



from rest_framework import serializers
from .models import Vehicle

class VehicleSerializer(serializers.ModelSerializer):
    # Використовуємо твій метод __str__ для колонки "Власник"
    owner_name = serializers.ReadOnlyField(source='employee.__str__')
    
    class Meta:
        model = Vehicle
        fields = [
            'id', 
            'employee',      # ID працівника (потрібен для вибору у випадаючому списку при додаванні)
            'owner_name',    # ПІБ власника (для відображення в таблиці)
            'plate_text',    # Номерний знак
            'brand_model'    # Марка та модель авто
        ]

    def validate_plate_text(self, value):
        return value.upper().strip()