# Guía Final de Despliegue en Dokploy - WhatsApp API SaaS

Este documento te guiará paso a paso sobre cómo desplegar este proyecto en tu servidor utilizando **Dokploy**.

---

## 1. Requisitos Previos

1. Tener tu servidor con **Dokploy** instalado y funcionando.
2. Haber enlazado tu cuenta de **GitHub** a Dokploy ("Settings" -> "Git providers").
3. Haber hecho **commit y push** de todos tus archivos en tu repositorio `Api-WhatsApp`.

---

## 2. Creación del Servicio en Dokploy

Sigue estos pasos dentro de tu panel de Dokploy:

1. Dirígete a tu panel principal en **Dokploy**.
2. Entra en un Proyecto de tu elección o crea uno nuevo (ej. "Proyectos Personales").
3. En la esquina superior derecha, haz clic en **+ Create Service**.
4. En el menú desplegable que aparece, selecciona **Compose**.

### 2.1. Configuración de Pestaña "General"
Dentro del nuevo servicio "Compose", configura lo siguiente:

* **Name:** Ponle el nombre que quieras a tu servicio (ej. `ws`).
* **App Name:** Se autocompletará. (Dejar por defecto)
* **Compose Type:** Selecciona `Docker Compose`
* Dale clic a **Create**.

En la siguiente pantalla de configuración, bajo la sección de **Provider**:
* En "Source", selecciona: **GitHub**.
* **Github Account:** Selecciona tu cuenta (`Erick-Zam-Server`).
* **Repository:** Selecciona el repositorio `Api-WhatsApp`.
* **Branch:** Selecciona `main`.
* **Compose Path:** Asegúrate de escribir exactamente `./docker-compose.yml`.
* **Trigger Type:** Déjalo en `On Push` (para despliegues automáticos al actualizar tu código).
* **Dale clic a Save** (Esquina inferior derecha).

---

## 3. Desplegar (Pestaña Deployments)

1. ¡No necesitas hacer nada en la pestaña **Environment**! Las variables, la base de datos y la persistencia de las sesiones de WhatsApp ya están preconfiguradas y automatizadas en tu archivo de docker-compose.
2. Dirígete a la pestaña superior derecha **Deployments**.
3. Dale clic al botón azul **Deploy** e iniciará el proceso de compilación. Espera unos minutos hasta que veas que todo está encendido y el estatus marque Éxito (Success/Running).

---

## 4. Configurar los Dominios (Pestaña Domains)

Una vez que el despliegue haya finalizado exitosamente, debes enrutar tus dominios al frontend y al backend. **NO expongas ni crees dominio para la Base de Datos (`db`) por seguridad.**

### 4.1. Añadir el dominio para el Frontend (Tu panel web)
Ve a la pestaña **Domains** dentro de tu proyecto en Dokploy:
1. Haz clic en **Add Domain**.
2. **Service Name:** Selecciona `frontend`. 
3. **Host:** Escribe `ws.erickvillon.dev`.
4. **Path:** `/`
5. **Internal Path:** `/`
6. **Container Port:** Escribe `3000`.
7. **HTTPS:** Activa el interruptor para provisionar automáticamente un certificado SSL gratuito.
8. Dale a **Create**.

### 4.2. Añadir el dominio para el Backend (API)
Haz clic nuevamente en **Add Domain** para añadir la API:
1. **Service Name:** Selecciona `backend`. 
2. **Host:** Escribe `ws-api.erickvillon.dev`.
3. **Path:** `/`
4. **Internal Path:** `/`
5. **Container Port:** Escribe `3001`.
6. **HTTPS:** Activa el interruptor para el certificado SSL.
7. Dale a **Create**.

---

## 5. Iniciar Sesión por Primera Vez

Como la base de datos es totalmente nueva y privada por seguridad, no existe una cuenta "admin" por defecto compartida.

1. Espera unos 30-60 segundos tras crear el dominio para que el candado SSL (HTTPS) se active, luego ingresa a `https://ws.erickvillon.dev/register` desde tu navegador.
2. Llena el breve formulario con un correo, un usuario y una clave de tu elección.
3. Ahora ve a `https://ws.erickvillon.dev/login` e inicia sesión con las credenciales seguras que acabas de inventar.
4. Conecta tu WhatsApp escaneando el código QR dentro del panel web. ¡Tus sesiones estarán permanentemente guardadas!

## Resumen de la Arquitectura
* ✔️ **whatsapp-db** (PostgreSQL privado y seguro, auto-creado)
* ✔️ **whatsapp-backend** (En `ws-api.erickvillon.dev`)
* ✔️ **whatsapp-frontend** (Tu panel en `ws.erickvillon.dev` conectado de forma nativa a la API)

¡Listo para producción! 🚀
