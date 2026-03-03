# Guía de Despliegue en Dokploy - WhatsApp API SaaS

Este documento te guiará paso a paso sobre cómo desplegar este proyecto en tu servidor utilizando **Dokploy**.
El proyecto ya ha sido optimizado y configurado para funcionar correctamente en un entorno de producción mediante Docker Compose.

---

## 1. Requisitos Previos

1. Tener tu servidor con **Dokploy** instalado y funcionando.
2. Haber enlazado tu cuenta de **GitHub** a Dokploy ("Settings" -> "Git providers").
3. Haber hecho **commit y push** de todos los cambios recientes que se te hicieron en el código, especialmente del archivo `docker-compose.yml`, `next.config.ts`, `schema.sql` y las rutas del frontend.

---

## 2. Creación del Servicio en Dokploy

Sigue estos pasos dentro de tu panel de Dokploy:

1. Dirígete a tu panel principal en **Dokploy**.
2. Entra en un Proyecto de tu elección o crea uno nuevo (ej. "Proyectos Personales").
3. En la esquina superior derecha, haz clic en **+ Create Service**.
4. En el menú desplegable que aparece, selecciona **Compose**.

### 2.1. Configuración de Pestaña "General"
Dentro del nuevo servicio "Compose", configura lo siguiente:

* **Name:** Ponle el nombre que quieras a tu servicio (ej. `whatsapp-api`).
* En "Source", selecciona: **Git Repository** (Aparecerá el logo de GitHub, GitLab, etc.).
* **Provider:** Selecciona tu cuenta de GitHub vinculada.
* **Repository:** Busca y selecciona `Api-WhatsApp` (o el nombre de este repo en tu cuenta).
* **Branch:** Normalmente es `main` o `master` (la rama donde tengas el código finalizado).
* **Compose Path:** Asegúrate de escribir exactamente `docker-compose.yml`.

### 2.2. Opcional: Variables de Entorno (Pestaña Environment)
En tu `docker-compose.yml` tienes valores por defecto como contraseñas y claves maestras. Es altamente recomendable que las modifiques por seguridad antes de subir todo a producción.
Si quieres, puedes cambiar las contraseñas que están quemadas en el archivo `docker-compose.yml` por unas secretas tuyas, específicamente las que dicen:
```yaml
  POSTGRES_PASSWORD: password    # (Cambia "password" por una clave robusta tuya)
  JWT_SECRET: docker-secret-key  # (Cambia "docker-secret-key" por una frase aleatoria tuya)
```
Si efectúas cambios, recuerda hacer de nuevo **commit y push** a tu repositorio.

---

## 3. Desplegar (Pestaña Deployments)

1. Una vez hecho el paso anterior, dirígete a la pestaña superior derecha **Deployments** o al botón que dice **Save / Deploy**.
2. Dale clic al botón azul **Deploy** e iniciará el proceso de compilación.
3. Dokploy va a descargar las imágenes (Node, Postgres), construir tu código de Front y Backend y levantar los 3 contenedores. Podrás ver los logs en vivo.

---

## 4. Configurar el Dominio Público (Pestaña Domains)

Una vez que el estado del despliegue sea **Running (Exitoso)**, necesitas decirle a Dokploy a qué contenedor tiene que mandar todo el tráfico web de tu dominio para que el proyecto se vea en internet.

1. Ve a la pestaña **Domains** *(o Trafik / Ingress dependiendo de la versión de tu Dokploy)* dentro del servicio.
2. Da clic en **Add Domain**.
3. **Host:** Escribe aquí tu dominio o subdominio (ej. `whatsapp.tudominio.com`). **Ojo**, recuerda que este dominio debe apuntar a la IP de tu servidor en tu proveedor de DNS (Cloudflare, GoDaddy, etc.).
4. **Port:** Aquí es crucial colocar el puerto `3000`. Este es el puerto del _Frontend_ de Next.js, el cual se encarga de mostrar la página visual y además, ahora mismo tiene el proxy de tráfico para pasarle peticiones internamente a tu Backend.
5. Selecciona la opción para **Generar Certificados SSL Automáticos (Let's Encrypt / HTTPS)**.
6. Dale a **Save / Create**.

---

## 5. ¡A Probar!

Una vez generado el Let's Encrypt (toma menos de 1 minuto):
1. Ingresa a `https://whatsapp.tudominio.com` (o como le hayas llamado).
2. Deberías poder ver la interfaz de inicio de sesión de Next.js.
3. Las comunicaciones Backend estarán yendo detrás de escena en `/api`, así que los problemas de conexión por CORS no ocurrirán.

### Nota sobre el inicio de sesión

Como la base de datos es nueva, no tendrás un usuario creado. Es posible que tengas que ver cómo crear ese usuario en la interfaz / base de datos o verificar tu ruta `/register` del frontend, en el archivo respectivo para crear la cuenta de usuario con rol administrativo.

## Resumen de la Arquitectura desplegada
* ✔️ **whatsapp-db** (Base de Datos Postgres inicializado con todas las tablas)
* ✔️ **whatsapp-backend** (El motor Baileys conectado persistente por el volumen)
* ✔️ **whatsapp-frontend** (Tu panel web conectado como puente de forma segura)

¡Listos para producción! 🚀
