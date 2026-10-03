from django.contrib.auth.validators import UnicodeUsernameValidator
from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'nombre', 'apellido', 'rol', 'password')
        extra_kwargs = {
            # Solo caracteres de usuario (letras, dígitos y . @ + - _):
            # impide guardar payloads en el username vía registro público.
            'username': {'validators': [UnicodeUsernameValidator()]},
            'password': {'write_only': True, 'min_length': 8},
            # El rol nunca se acepta desde el registro público:
            # siempre queda el default del modelo (CLIENTE).
            # Los roles BARBERO/SUPER_ADMIN se crean desde el admin.
            'rol': {'read_only': True},
        }

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user