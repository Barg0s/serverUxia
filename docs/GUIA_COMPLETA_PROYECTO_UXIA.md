# 📖 Guía Completa del Proyecto UXIA

> **¿Qué es UXIA?** Es un sistema formado por **tres aplicaciones** que trabajan juntas: un servidor central (Node.js), una app móvil Android (Kotlin) y una app de escritorio (Flutter). El objetivo es conectarse por Bluetooth a un dispositivo ESP32 con cámara, recibir fotos, enviarlas a un servidor con IA para analizarlas, y gestionar usuarios y estadísticas desde el escritorio.

---

## 📑 Índice

1. [Visión General del Sistema](#1-visión-general-del-sistema)
2. [Servidor (serverUxia) — Node.js](#2-servidor-serveruxia--nodejs)
3. [App Móvil (appMobilUxia) — Android/Kotlin](#3-app-móvil-appmobiluxia--androidkotlin)
4. [App Desktop (appDesktopUxia) — Flutter/Dart](#4-app-desktop-appdesktopuxia--flutterdart)
5. [Cómo se comunican entre sí](#5-cómo-se-comunican-entre-sí)
6. [Cómo instalar y ejecutar](#6-cómo-instalar-y-ejecutar)

---

## 1. Visión General del Sistema

```
┌──────────────┐     Bluetooth (BLE)     ┌───────────────┐
│   ESP32      │ ◄─────────────────────► │  App Móvil    │
│  (Cámara)    │    Envía foto en bytes   │  (Android)    │
└──────────────┘                          └───────┬───────┘
                                                  │ HTTP POST
                                                  │ (imagen Base64)
                                                  ▼
                                          ┌───────────────┐
                                          │   Servidor    │
                                          │  (Node.js)    │
                                          │   + MySQL     │
                                          │   + Ollama IA │
                                          └───────┬───────┘
                                                  │ HTTP GET/POST
                                                  │ (usuarios, stats)
                                                  ▼
                                          ┌───────────────┐
                                          │  App Desktop  │
                                          │  (Flutter)    │
                                          └───────────────┘
```

**Resumen de cada parte:**

| Componente | Tecnología | Función |
|:---|:---|:---|
| **Servidor** | Node.js + Express + MySQL | API REST central. Gestiona usuarios, recibe imágenes, llama a la IA (Ollama), guarda datos |
| **App Móvil** | Android (Kotlin) | Se conecta al ESP32 por Bluetooth, recibe fotos, las envía al servidor, lee la respuesta en voz alta |
| **App Desktop** | Flutter (Dart) | Panel de administración: login, ver usuarios, logout, ver estadísticas de etiquetas con gráficos |

---

## 2. Servidor (serverUxia) — Node.js

### ¿Qué es Node.js?

Node.js permite ejecutar JavaScript fuera del navegador. En este proyecto, lo usamos para crear un **servidor web** (una API REST) que escucha peticiones de las apps y responde con datos en formato JSON.

### Estructura de carpetas

```
serverUxia/
├── .env                    ← Variables secretas (contraseñas BD, puerto)
├── .env.example            ← Ejemplo de cómo rellenar .env
├── docker-compose.yml      ← Levanta MySQL con Docker (desarrollo local)
├── setup_mysql.sql          ← Script SQL para crear usuario en MySQL
├── package.json            ← Lista de dependencias del proyecto
├── test_api.js             ← Script de pruebas de la API
└── src/
    ├── server.js           ← PUNTO DE ENTRADA. Arranca todo
    ├── config/
    │   └── database.js     ← Conexión a MySQL
    ├── middleware/
    │   └── auth.js         ← Verificación de tokens
    ├── models/
    │   ├── index.js        ← Exporta todos los modelos y define relaciones
    │   ├── User.js         ← Modelo de usuario
    │   ├── AnalysisRequest.js ← Modelo de petición de análisis
    │   └── Response.js     ← Modelo de respuesta de la IA
    ├── routes/
    │   └── api.js          ← TODOS los endpoints de la API
    └── utils/
        └── response.js     ← Función helper para respuestas JSON
```

---

### 📄 `server.js` — El punto de entrada

Este es el archivo que se ejecuta con `node src/server.js`. Hace lo siguiente en orden:

1. **Importa las dependencias**: Express (servidor web), body-parser (lee JSON del cuerpo de peticiones), cors (permite peticiones desde otros dominios)
2. **Configura Express**: Activa CORS y aumenta el límite de cuerpo a 50MB (necesario para recibir imágenes en Base64)
3. **Conecta las rutas**: Todas las URLs que empiezan por `/api` son gestionadas por `routes/api.js`
4. **Sincroniza la base de datos**: Sequelize compara los modelos con las tablas de MySQL y las crea/actualiza. `alter: true` añade columnas nuevas sin borrar datos
5. **Crea usuario admin por defecto**: Si no existe `admin@example.com`, lo crea con contraseña `password` y rol `admin`
6. **Arranca el servidor**: Escucha en el puerto configurado (por defecto 3000)

```javascript
// Ejemplo simplificado de cómo funciona:
const app = express();          // Crea la aplicación
app.use('/api', apiRoutes);     // Conecta las rutas
db.sequelize.sync()             // Sincroniza BD
  .then(() => app.listen(3000)) // Arranca
```

---

### 📄 `config/database.js` — Conexión a MySQL

Usa **Sequelize** (un ORM que traduce operaciones de BD a JavaScript) para conectarse a MySQL. Lee las credenciales desde el archivo `.env`:

- `DB_HOST`: Dirección del servidor MySQL (normalmente `localhost`)
- `DB_USER`: Usuario MySQL
- `DB_PASS`: Contraseña MySQL
- `DB_NAME`: Nombre de la base de datos (por defecto `uxia`)

También configura un **pool de conexiones**: máximo 5 conexiones simultáneas, y tiempo de espera de 30 segundos.

---

### 📄 `middleware/auth.js` — Autenticación por Token

Un **middleware** es una función que se ejecuta **antes** de la ruta real. Es como un guardia de seguridad que comprueba tu identidad antes de dejarte pasar.

**¿Cómo funciona?**

1. Busca la cabecera `Authorization` en la petición HTTP
2. Comprueba que tenga el formato `Bearer <TOKEN>`
3. Extrae el token y busca en la BD un usuario que tenga ese token como `api_key`
4. Si lo encuentra, guarda el usuario en `req.user` para que la ruta pueda usarlo
5. Si no lo encuentra, devuelve error 401 (No autorizado)

```
Petición HTTP:
  Headers: { Authorization: "Bearer ADMIN1234TOKEN" }
                                     ↓
  middleware/auth.js busca: User WHERE api_key = "ADMIN1234TOKEN"
                                     ↓
  Si existe → req.user = usuario encontrado → continúa a la ruta
  Si NO existe → Responde con error 401 "Token invàlid"
```

---

### 📄 `models/User.js` — Modelo de Usuario

Define la tabla `Users` en MySQL. Cada campo del modelo se convierte en una columna:

| Campo | Tipo | Descripción |
|:---|:---|:---|
| `nickname` | STRING | Nombre de usuario (app móvil) |
| `email` | STRING (único) | Email para login (admin) |
| `password` | STRING | Contraseña (solo admin, en texto plano por ahora) |
| `telefon` | STRING | Teléfono del usuario móvil |
| `role` | ENUM ('admin','normal') | Rol del usuario. Por defecto 'normal' |
| `validat` | BOOLEAN | Si ha validado su teléfono. Por defecto false |
| `api_key` | STRING | Token de sesión actual (se genera al hacer login) |
| `tos` | BOOLEAN | Aceptación de términos de servicio |

---

### 📄 `models/AnalysisRequest.js` — Petición de Análisis

Se crea un registro cada vez que alguien envía una imagen para analizar:

| Campo | Tipo | Descripción |
|:---|:---|:---|
| `imageId` | STRING | Identificador único de la imagen (IMG_timestamp) |
| `prompt` | TEXT | El texto/pregunta que se envía a la IA |
| `imageBase64` | LONGTEXT | La imagen completa codificada en Base64 |
| `timestamp` | DATE | Fecha y hora de la petición |

---

### 📄 `models/Response.js` — Respuesta de la IA

Se crea cuando Ollama (la IA) devuelve su análisis:

| Campo | Tipo | Descripción |
|:---|:---|:---|
| `description` | TEXT | Descripción textual de lo que ve la IA en la imagen |
| `tags` | TEXT | Lista de etiquetas en formato JSON (ej: `["gat","animal"]`) |
| `model_used` | STRING | Nombre del modelo de IA usado (ej: `llava`) |
| `processing_time` | STRING | Tiempo que tardó el análisis (ej: `2.5s`) |

---

### 📄 `models/index.js` — Relaciones entre tablas

Define cómo se relacionan los modelos entre sí:

```
User  ──────────►  AnalysisRequest  ──────────►  Response
       1 a muchos                    1 a 1
  (userId)                      (requestId)
```

- Un **User** puede hacer muchas **AnalysisRequest** (1 a muchos)
- Cada **AnalysisRequest** tiene una sola **Response** (1 a 1)

---

### 📄 `routes/api.js` — Todos los Endpoints

Este es el archivo más importante del servidor. Define todas las URLs a las que las apps pueden llamar.

#### Endpoints de usuario móvil (sin autenticación admin):

| Método | URL | ¿Qué hace? |
|:---|:---|:---|
| POST | `/api/usuaris/registrar` | Registra un nuevo usuario con nickname, email y teléfono |
| POST | `/api/usuaris/validar` | Simula validación por SMS y genera una API Key |
| GET | `/api/usuaris/perfil` | Devuelve datos del usuario (requiere token) |

#### Endpoints de administrador (requieren token admin):

| Método | URL | ¿Qué hace? |
|:---|:---|:---|
| POST | `/api/admin/usuaris/login` | Login: recibe email+password, devuelve token |
| POST | `/api/admin/usuaris/logout` | Logout: borra el token del usuario en la BD |
| POST | `/api/admin/usuaris/testtoken` | Comprueba si el token es válido |
| GET | `/api/admin/usuaris` | Lista todos los usuarios registrados |
| GET | `/api/admin/estadistiques/tags` | Devuelve conteo de etiquetas de todas las respuestas IA |

#### Endpoints de análisis de imagen:

| Método | URL | ¿Qué hace? |
|:---|:---|:---|
| POST | `/api/analitzar-imatge` | **REAL**: Envía imagen a Ollama, guarda en BD, devuelve descripción+tags |
| POST | `/api/analitzar-imatge-test` | **TEST**: Devuelve siempre una respuesta mock para pruebas |

**Flujo detallado de `/api/analitzar-imatge`:**

```
1. Recibe JSON: { "image": "base64..." }
2. Guarda petición en tabla AnalysisRequest
3. Envía imagen a Ollama (API local de IA)
   → POST http://localhost:11434/api/generate
   → Con el modelo "llava" (visión + texto)
   → Prompt: "Descriu aquesta imatge en català..."
4. Obtiene respuesta de Ollama
5. Extrae descripción y tags del texto
6. Guarda respuesta en tabla Response
7. Devuelve JSON: { description, tags, processing_time }
```

Si Ollama no está disponible, el servidor no se cae: devuelve un mensaje de fallback.

---

### 📄 `utils/response.js` — Helper de respuestas

Una función simple que estandariza todas las respuestas de la API:

```json
{
  "status": "OK",          // o "ERROR"
  "message": "Texto explicativo",
  "data": { ... }          // datos opcionales
}
```

Así todas las apps saben exactamente qué estructura esperar.

---

### 📄 `docker-compose.yml` y `setup_mysql.sql`

- **docker-compose.yml**: Levanta un contenedor Docker con MySQL 8.0 para desarrollo local. Solo necesitas ejecutar `docker-compose up` y tendrás MySQL listo
- **setup_mysql.sql**: Crea un usuario dedicado `uxia_user` con permisos sobre la BD `uxia`

---

## 3. App Móvil (appMobilUxia) — Android/Kotlin

### ¿Qué es Kotlin?

Kotlin es el lenguaje de programación oficial para Android. Es similar a Java pero más moderno y conciso.

### Estructura de carpetas

```
appMobilUxia/app/src/main/java/com/davidbargados/appmobiluxia/
├── MainActivity.kt         ← Actividad principal (punto de entrada)
├── Dispositiu.kt           ← Modelo de datos para dispositivos BLE
├── CustomAdapter.kt        ← Adaptador para la lista de dispositivos
├── BLEObserver.kt          ← Observador del estado del Bluetooth
├── BLEconnDialog.kt        ← Diálogo de conexión BLE (el más complejo)
└── ui/
    ├── home/
    │   └── UlladaFragment.kt    ← Pestaña "Ullada" (vista principal)
    ├── dashboard/
    │   └── HistorialFragment.kt ← Pestaña "Historial"
    └── notifications/
        └── AjustosFragment.kt   ← Pestaña "Ajustos" (configuración BLE)
```

---

### 📄 `MainActivity.kt` — Punto de entrada

Es la actividad principal de Android. Configura:

- **View Binding**: Infla el layout `activity_main.xml`
- **BottomNavigationView**: La barra de navegación inferior con 3 pestañas
- **NavController**: Gestiona la navegación entre los 3 fragments (Ullada, Historial, Ajustos)

```
┌────────┬────────────┬──────────┐
│ Ullada │ Historial  │ Ajustos  │  ← Barra inferior
└────────┴────────────┴──────────┘
```

---

### 📄 `Dispositiu.kt` — Modelo de datos

Una **data class** de Kotlin (como un struct). Representa un dispositivo Bluetooth:

```kotlin
data class Dispositiu(
    val nom: String,       // Nombre del dispositivo (ej: "ESP32-CAM")
    val mac: String,       // Dirección MAC (ej: "AA:BB:CC:DD:EE:FF")
    var isConnected: Boolean  // Si está conectado ahora
)
```

---

### 📄 `CustomAdapter.kt` — Lista de dispositivos

Un **RecyclerView Adapter** que muestra los dispositivos Bluetooth emparejados en una lista. Para cada dispositivo muestra:

- El nombre del dispositivo
- Un icono diferente según si está conectado o no
- Es clickable: al tocar un dispositivo, se abre el diálogo de conexión BLE

---

### 📄 `BLEObserver.kt` — Observador de Bluetooth

Escucha cambios en el estado del Bluetooth del teléfono (encendido/apagado). Usa un **BroadcastReceiver** de Android:

- Cuando se **enciende** el Bluetooth → ejecuta `onEnabled()`
- Cuando se **apaga** el Bluetooth → ejecuta `onDisabled()`

Se registra en `onStart()` y se desregistra en `onStop()` de cada Fragment.

---

### 📄 `BLEconnDialog.kt` — El corazón de la app (¡640+ líneas!)

Este es el archivo más complejo. Es un **Dialog** (ventana emergente) que gestiona toda la comunicación con el ESP32. Explicamos cada parte:

#### Variables importantes:

```kotlin
// UUIDs del servicio BLE del ESP32 (deben coincidir con el firmware)
SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// Almacenamiento de la foto
receivedData = ByteArrayOutputStream()  // Buffer para los bytes de la foto
lastImageData: ByteArray?               // La foto completa para enviar al servidor
```

#### Flujo completo:

```
1. Se abre el diálogo → Conecta automáticamente al ESP32
2. ESP32 envía la foto en paquetes (bytes por BLE)
3. Se reciben todos los paquetes → Se ensambla la foto
4. La foto se muestra en el ImageView del diálogo
5. Aparece el botón "Enviar"
6. Usuario pulsa "Enviar" → Se envía al servidor como Base64
7. Servidor responde con descripción + tags
8. Se muestra AlertDialog con la respuesta
9. TTS lee la descripción y tags en catalán
10. Usuario pulsa "Acceptar" → Se cierra todo y desconecta BLE
```

#### Funciones principales:

| Función | ¿Qué hace? |
|:---|:---|
| `connectToDevice()` | Inicia la conexión BLE con el ESP32 |
| `gattCallback` | Maneja los eventos BLE (conectado, servicio descubierto, datos recibidos) |
| `savePhoto()` | Ensambla los bytes en una imagen, la guarda como archivo JPG |
| `sendImageToServer()` | Convierte la imagen a Base64, hace POST al servidor |
| `showResponseDialog()` | Muestra la respuesta de la IA en un AlertDialog |
| `speakResponse()` | Usa TextToSpeech para leer descripción y tags en catalán |
| `disconnect()` | Cierra la conexión BLE limpiamente |
| `cancelConnection()` | Cancela, desconecta y cierra el diálogo |

#### Text-to-Speech (TTS):

Se inicializa al crear el diálogo con el idioma catalán (`Locale("ca")`). Si el catalán no está disponible en el dispositivo, usa español como fallback. Al recibir la respuesta:

1. Primero dice: "Descripció: [texto]" (con `QUEUE_FLUSH` para limpiar cola)
2. Después dice: "Etiquetes: [tag1, tag2...]" (con `QUEUE_ADD` para encolar)
3. Al cerrar el diálogo, se para y libera el TTS

---

### 📄 `UlladaFragment.kt` — Pestaña principal "Ullada"

Es la primera pestaña que ve el usuario. Su función:

1. **Lee la MAC guardada** del archivo `settings.xml` (guardado previamente en Ajustos)
2. **Si hay una MAC guardada**: Muestra nombre y MAC del dispositivo, habilita el botón "Captura", y abre automáticamente el diálogo BLE
3. **Si no hay MAC**: Muestra el botón "Ajustos" para ir a configurar un dispositivo
4. **Botón "Captura"**: Abre el diálogo BLE para conectar y recibir foto
5. **Cuando recibe foto**: La muestra en el `ImageView` `fotoEnviada` de la interfaz

---

### 📄 `AjustosFragment.kt` — Pestaña "Ajustos"

Permite al usuario seleccionar y configurar el dispositivo BLE:

1. **Solicita permisos** de Bluetooth al usuario
2. **Lista los dispositivos emparejados** del teléfono en un RecyclerView
3. **Al tocar un dispositivo**: Guarda su MAC en `settings.xml` y abre el diálogo BLE
4. **Observa el Bluetooth**: Si se apaga, limpia la lista; si se enciende, la actualiza

---

### 📄 `HistorialFragment.kt` — Pestaña "Historial"

Por ahora es una pestaña básica con un TextView controlado por un ViewModel. Está preparada para mostrar un historial de fotos/análisis en el futuro.

---

## 4. App Desktop (appDesktopUxia) — Flutter/Dart

### ¿Qué es Flutter?

Flutter es un framework de Google para crear apps desde un solo código. En este proyecto se usa para crear una **aplicación de escritorio** (Windows/macOS/Linux) de administración.

### ¿Qué es Dart?

Dart es el lenguaje de programación de Flutter. Es similar a JavaScript/TypeScript.

### Estructura de carpetas

```
appDesktopUxia/lib/
├── main.dart                    ← Punto de entrada
├── screens/
│   ├── login_screen.dart        ← Pantalla de login
│   ├── home_screen.dart         ← Panel principal (lista usuarios)
│   └── stats_screen.dart        ← Pantalla de estadísticas
├── utils/
│   └── settings_manager.dart    ← Gestión del archivo settings.json
└── widgets/
    └── tag_bar_chart.dart       ← CustomPainter para gráfico de barras
```

---

### 📄 `main.dart` — Punto de entrada

Configura la app Flutter y decide qué pantalla mostrar primero usando un **SplashScreen**:

```
¿Existe settings.json?
  └── NO → Mostrar LoginScreen (formulario vacío)
  └── SÍ → ¿Tiene token?
       └── NO → Mostrar LoginScreen (con URL pre-rellenada)
       └── SÍ → Verificar token con el servidor
            └── Token válido → Ir a HomeScreen
            └── Token inválido → Ir a LoginScreen
```

---

### 📄 `utils/settings_manager.dart` — Persistencia de configuración

Gestiona un archivo `settings.json` en el directorio de datos de la app. Tres funciones estáticas:

| Función | ¿Qué hace? |
|:---|:---|
| `saveSettings(url, token?)` | Guarda URL del servidor y opcionalmente el token |
| `loadSettings()` | Lee y devuelve un Map con `serverUrl` y `token` si existen |
| `clearToken()` | Borra solo el token del archivo (para logout) |

**Comportamiento según el archivo:**

| Estado del archivo | Resultado en la UI |
|:---|:---|
| No existe | Formulario de login completamente vacío |
| Existe sin token | URL pre-rellenada, usuario y contraseña vacíos |
| Existe con token | Auto-login (se salta el formulario) |

---

### 📄 `screens/login_screen.dart` — Pantalla de Login

Un formulario con tres campos:

1. **URL del Servidor** (se carga desde settings.json si existe)
2. **Email / Usuario**
3. **Contraseña** (con botón para mostrar/ocultar)

**Al pulsar "Iniciar Sesión":**

1. Valida que los campos no estén vacíos
2. Hace POST a `{url}/api/admin/usuaris/login` con email y password
3. Si el servidor responde OK → Guarda URL + token en settings.json → Navega a HomeScreen
4. Si falla → Muestra mensaje de error en rojo

---

### 📄 `screens/home_screen.dart` — Panel principal

Muestra la lista de todos los usuarios registrados (solo para admins). Tiene tres botones en la barra superior:

| Icono | Acción |
|:---|:---|
| 📊 (bar_chart) | Navega a StatsScreen (estadísticas) |
| ✅ (verified_user) | Test Token: verifica si el token sigue siendo válido |
| 🚪 (logout) | Cierra sesión: borra token local + token en servidor |

**Test Token:** Hace POST a `/api/admin/usuaris/testtoken`. Si es válido, muestra ✅. Si no, muestra ❌.

**Logout:** Hace POST a `/api/admin/usuaris/logout`, borra el token de `settings.json`, y vuelve al LoginScreen.

---

### 📄 `screens/stats_screen.dart` — Pantalla de Estadísticas

Una pantalla dividida en dos partes:

**Barra lateral izquierda (250px):**
- Lista todas las etiquetas disponibles
- Cada etiqueta tiene un color único, un checkbox visual y el conteo
- Botones "Tot" (seleccionar todas) y "Cap" (deseleccionar todas)

**Área principal (resto de la pantalla):**
- Gráfico de barras dibujado con **CustomPainter**
- Solo muestra las etiquetas seleccionadas
- Cada barra tiene el color correspondiente a su etiqueta

Obtiene los datos del endpoint `GET /api/admin/estadistiques/tags`.

---

### 📄 `widgets/tag_bar_chart.dart` — Gráfico con CustomPainter

**CustomPainter** es una clase de Flutter que permite dibujar gráficos personalizados píxel a píxel sobre un Canvas. Es como pintar en un lienzo.

**Elementos que dibuja:**

1. **Ejes** X e Y con líneas grises
2. **Líneas de referencia** horizontales (gridlines) con valores numéricos
3. **Barras** con gradiente vertical (más oscuro arriba, más claro abajo)
4. **Sombra** detrás de cada barra para dar profundidad
5. **Valor numérico** encima de cada barra
6. **Nombre del tag** debajo de cada barra (ligeramente rotado)

Si no hay etiquetas seleccionadas, muestra el mensaje "Selecciona etiquetes de la barra lateral".

---

## 5. Cómo se comunican entre sí

### App Móvil → Servidor

```
POST /api/analitzar-imatge-test
Body: { "image": "iVBORw0KGgo..." }  ← Base64 de la foto
Response: { "description": "...", "tags": ["gat","animal"] }
```

### App Desktop → Servidor

```
POST /api/admin/usuaris/login
Body: { "email": "admin@example.com", "password": "password" }
Headers: (ninguno)
Response: { "token": "ADMIN170000TOKEN" }

GET /api/admin/usuaris
Headers: { Authorization: "Bearer ADMIN170000TOKEN" }
Response: [{ nickname, email, telefon, validat, tos }, ...]

GET /api/admin/estadistiques/tags
Headers: { Authorization: "Bearer ADMIN170000TOKEN" }
Response: { "tags": [{ "tag": "gat", "count": 5 }, ...] }
```

### Formato estándar de respuesta del servidor

```json
{
  "status": "OK",
  "message": "Texto descriptivo",
  "data": { ... }
}
```

---

## 6. Cómo instalar y ejecutar

### Servidor

```bash
# 1. Ir al directorio del servidor
cd serverUxia

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
# Copiar .env.example a .env y editar las credenciales de MySQL
cp .env.example .env

# 4. (Opcional) Levantar MySQL con Docker
docker-compose up -d

# 5. Ejecutar el servidor
npm start
# O en modo desarrollo (se reinicia al guardar cambios):
npm run dev
```

### App Desktop (Flutter)

```bash
# 1. Ir al directorio
cd appDesktopUxia

# 2. Instalar dependencias
flutter pub get

# 3. Ejecutar en Windows
flutter run -d windows
```

### App Móvil (Android)

1. Abrir `appMobilUxia` en **Android Studio**
2. Sincronizar Gradle (se descargan dependencias automáticamente)
3. Conectar un dispositivo Android o usar emulador
4. Pulsar ▶️ Run

### Variables de entorno del servidor

| Variable | Valor por defecto | Descripción |
|:---|:---|:---|
| `PORT` | 3000 | Puerto del servidor |
| `DB_HOST` | localhost | Host de MySQL |
| `DB_USER` | root | Usuario MySQL |
| `DB_PASS` | password | Contraseña MySQL |
| `DB_NAME` | uxia | Nombre de la BD |
| `OLLAMA_URL` | http://localhost:11434 | URL de Ollama (IA) |
| `OLLAMA_MODEL` | llava | Modelo de visión por IA |

---

> **📝 Nota final:** Este proyecto sigue una arquitectura **cliente-servidor**. El servidor es el centro de todo: almacena datos, procesa imágenes y gestiona autenticación. Las apps (móvil y desktop) son clientes que consumen los endpoints REST del servidor. La comunicación siempre es en formato JSON sobre HTTP/HTTPS.
