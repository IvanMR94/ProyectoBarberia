from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'nombre', 'apellido', 'rol', 'password')
        extra_kwargs = {
            'password': {'write_only': True},
            # El rol nunca se acepta desde el registro público:
            # siempre queda el default del modelo (CLIENTE).
            # Los roles BARBERO/SUPER_ADMIN se crean desde el admin.
            'rol': {'read_only': True},
        }

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user