# Guía Tutorial: Ejecutar UXIA Server en Proxmox

Esta guía está pensada para cualquier miembro del equipo que necesite trabajar con el servidor UXIA en el Proxmox de clase.

---

## 🔐 Credenciales Importantes

### Conexión SSH al Proxmox
```
Host: ieticloudpro.ieti.cat
Puerto: 20127
Usuario: uxia6
Comando: ssh -p 20127 uxia6@ieticloudpro.ieti.cat
```
> Necesitas tener tu clave SSH configurada. Pregunta al profesor si no puedes entrar.

### Base de Datos MySQL
| Campo | Valor |
|:---|:---|
| Host | `localhost` |
| Usuario | `uxia_user` |
| Contraseña | `uxia_password_2026` |
| Base de datos | `uxia` |

### Usuario Admin del Sistema UXIA
| Campo | Valor |
|:---|:---|
| Email | `admin@example.com` |
| Contraseña | `password` |

---

## 🚀 Cómo Ejecutar el Servidor

### 1. Conectarse al Proxmox
```bash
ssh -p 20127 uxia6@ieticloudpro.ieti.cat
```

### 2. Ir a la carpeta del proyecto
```bash
cd ~/uxiasv/serverUxia
```

### 3. Arrancar el servidor
```bash
node src/server.js
```

Si todo va bien verás:
```
Base de Datos sincronizada
Usuario Admin creado (admin@example.com / password)
Servidor ejecutándose en el puerto 3000
```

### 4. (Opcional) Dejarlo encendido permanentemente con PM2
```bash
pm2 start src/server.js --name "uxia-api"
pm2 save
```

Para ver el estado: `pm2 status`
Para ver los logs: `pm2 logs uxia-api`
Para pararlo: `pm2 stop uxia-api`

---

## 🔄 Cómo Actualizar el Código desde GitHub

Si alguien ha subido cambios al repositorio y quieres actualizar el servidor:

### 1. Parar el servidor (si está corriendo con pm2)
```bash
pm2 stop uxia-api
```

### 2. Descargar los cambios
```bash
cd ~/uxiasv/serverUxia
git pull origin main
```
> Si te da error de permisos, usa `sudo git pull origin main`

### 3. Instalar nuevas dependencias (si las hay)
```bash
sudo npm install
```

### 4. Reiniciar el servidor
```bash
pm2 start uxia-api
# O si no usas pm2:
node src/server.js
```

---

## 🛠️ Solución de Problemas Comunes

### Error: "Permission denied"
Los archivos fueron creados como root. Usa `sudo` delante del comando.

### Error: "Access denied for user 'root'@'localhost'"
El archivo `.env` tiene credenciales incorrectas. Debe contener:
```
PORT=3000
DB_HOST=localhost
DB_USER=uxia_user
DB_PASS=uxia_password_2026
DB_NAME=uxia
```

Para arreglarlo:
```bash
nano ~/uxiasv/serverUxia/.env
```
Edita, guarda con `Ctrl+O`, `Enter`, `Ctrl+X`.

### Error: "MODULE_NOT_FOUND"
Las dependencias no están instaladas o están corruptas:
```bash
cd ~/uxiasv/serverUxia
sudo rm -rf node_modules
sudo npm install
```

### Error: "EADDRINUSE: address already in use"
El servidor ya está corriendo. Mátalo primero:
```bash
pm2 stop uxia-api
# O encuentra el proceso manualmente:
ps aux | grep node
kill -9 <PID>
```

---

## 📁 Estructura de Carpetas en el Proxmox

```
/home/uxia6/
└── uxiasv/
    └── serverUxia/        ← Aquí está el proyecto
        ├── src/
        │   ├── server.js  ← Punto de entrada
        │   ├── routes/    ← Endpoints API
        │   ├── models/    ← Modelos de BD
        │   └── config/    ← Configuración BD
        ├── .env           ← Credenciales (NO subir a GitHub)
        └── package.json
```

---

## ✅ Checklist Rápido

- [ ] ¿Puedo conectarme por SSH?
- [ ] ¿MySQL está corriendo? (`systemctl status mysql`)
- [ ] ¿El archivo `.env` tiene las credenciales correctas?
- [ ] ¿He ejecutado `npm install`?
- [ ] ¿El servidor arranca sin errores?

---

*Última actualización: Febrero 2026*
