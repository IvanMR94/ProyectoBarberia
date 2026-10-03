-- Permisos para el usuario de la aplicación.
-- Necesarios tambien para la base de datos de tests (test_barberbook),
-- que Django crea y elimina automaticamente al correr "manage.py test".
GRANT ALL PRIVILEGES ON *.* TO 'barberbook'@'%';
FLUSH PRIVILEGES;
