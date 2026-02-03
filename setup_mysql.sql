CREATE USER IF NOT EXISTS 'uxia_user'@'localhost' IDENTIFIED BY 'uxia_password_2026';
GRANT ALL PRIVILEGES ON uxia.* TO 'uxia_user'@'localhost';
FLUSH PRIVILEGES;
