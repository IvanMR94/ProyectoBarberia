-- Permisos para el usuario de la aplicación.
-- Necesarios tambien para la base de datos de tests (test_barberbook),
-- que Django crea y elimina automaticamente al correr "manage.py test".
-- Restringido a las bases del proyecto (antes era *.*, que otorgaba
-- permisos sobre TODAS las bases del servidor).
GRANT ALL PRIVILEGES ON barberbook.* TO 'barberbook'@'%';
GRANT ALL PRIVILEGES ON test_barberbook.* TO 'barberbook'@'%';
FLUSH PRIVILEGES;
