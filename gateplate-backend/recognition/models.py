from django.db import models

# Create your models here.

from django.db import models

class Camera(models.Model):
    name = models.CharField(max_length=100, verbose_name="Назва камери")
    location = models.CharField(max_length=255, blank=True, verbose_name="Розташування")
    stream_url = models.CharField(max_length=255, verbose_name="Потік (IP/URL)")
    is_active = models.BooleanField(default=True, verbose_name="Активна")

    def __str__(self):
        return self.name



class Department(models.Model):
    name = models.CharField(max_length=255, verbose_name="Назва підрозділу")
    parent = models.ForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='subsections',
        verbose_name="Входить до підрозділу"
    )

    def __str__(self):
        if self.parent:
            return f"{self.parent.name} -> {self.name}"
        return self.name

    class Meta:
        verbose_name = "Підрозділ"
        verbose_name_plural = "Підрозділи"




class Employee(models.Model):
    photo = models.ImageField(upload_to='employees/', null=True, blank=True)    
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    department = models.ForeignKey(
        Department, 
        on_delete=models.PROTECT, 
        verbose_name="Підрозділ"
    )
    phone = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    class Meta:
        verbose_name = "Працівник"
        verbose_name_plural = "Працівники"



class Vehicle(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='vehicles', verbose_name="Власник")
    plate_text = models.CharField(max_length=20, unique=True, verbose_name="Номер авто")
    brand_model = models.CharField(max_length=100, blank=True, verbose_name="Марка/Модель")

    def __str__(self):
        return f"{self.plate_text} ({self.employee.last_name}, {self.employee.first_name})"



class AccessPermit(models.Model):
    vehicle = models.OneToOneField(Vehicle, on_delete=models.CASCADE, verbose_name="Автомобіль")
    is_allowed = models.BooleanField(default=True, verbose_name="Дозвіл")
    end_date = models.DateField(null=True, blank=True, verbose_name="Дійсний до")

    def __str__(self):
        return f"Дозвіл {self.vehicle.plate_text}"
    


class BlackList(models.Model):
    plate_text = models.CharField(max_length=20, unique=True, verbose_name="Номер у чорному списку")
    added_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата додавання")

    class Meta:
        verbose_name = "Чорний список"
        verbose_name_plural = "Чорний список"

    def __str__(self):
        return f"BLOCK: {self.plate_text}"
    



class DetectedPlate(models.Model):
    camera = models.ForeignKey(Camera, on_delete=models.SET_NULL, null=True, verbose_name="Камера")
    plate_text = models.CharField(max_length=20, verbose_name="Розпізнаний номер")
    
    vehicle = models.ForeignKey(
        'Vehicle', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='detections', 
        verbose_name="Розпізнане авто"
    )
    
    image = models.ImageField(upload_to='detections/%Y/%m/%d/', verbose_name="Фото фіксації", null=True, blank=True)
    confidence = models.FloatField(verbose_name="Впевненість AI")
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Час події")

    class Meta:
        verbose_name = "Розпізнаний номер"
        verbose_name_plural = "Розпізнані номери"
        ordering = ['-timestamp'] 

    @property
    def is_known(self):
        return self.vehicle is not None
    
    def __str__(self):
        return f"{self.plate_text} - {self.timestamp.strftime('%H:%M:%S')}"