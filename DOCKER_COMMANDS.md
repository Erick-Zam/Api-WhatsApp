# Guía de Comandos Docker para WhatsApp SaaS API

Esta guía contiene los comandos necesarios para gestionar, reconstruir y depurar los contenedores de la aplicación.

## 🚀 Reconstrucción Total (Recomendado)

Para aplicar cambios en **Frontend** y **Backend** simultáneamente y asegurar que todo esté sincronizado:

```bash
docker-compose down
docker-compose up -d --build
```

---

## 🛠 Reconstrucción Individual

Si solo has modificado código en un servicio específico, puedes reconstruir solo ese contenedor para ahorrar tiempo.

### 1. Frontend (Next.js)
Usa esto si modificaste archivos en `frontend/src`.

```bash
# Reconstruir y reiniciar solo el contenedor de frontend
docker-compose up -d --build whatsapp-frontend
```

Para ver los logs del frontend mientras arranca:
```bash
docker logs -f whatsapp-frontend
```

### 2. Backend (Node.js / Express)
Usa esto si modificaste archivos en `Backend/src`.

```bash
# Reconstruir y reiniciar solo el contenedor de backend
docker-compose up -d --build whatsapp-backend
```

Para reiniciar el servicio sin reconstruir (útil si usas nodemon en desarrollo, aunque en Docker es mejor reiniciar):
```bash
docker restart whatsapp-backend
```

### 3. Base de Datos (PostgreSQL)
Normalmente no necesitas reconstruir esto a menos que cambies la configuración de Dockerfile de la DB.

```bash
docker-compose up -d --build whatsapp-db
```

---

## 🧹 Comandos de Limpieza y Utilidad

### Ver Estado de los Contenedores
```bash
docker-compose ps
```

### Ver Logs en Tiempo Real
```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs solo del backend (Saldrá del log con Ctrl + C)
docker logs -f whatsapp-backend
```

### Entrar a la Terminal del Contenedor
Útil para ejecutar scripts manuales o verificar archivos dentro.

**Backend:**
```bash
docker exec -it whatsapp-backend sh
```

**Base de Datos (PostgreSQL):**
```bash
docker exec -it whatsapp-db psql -U admin -d whatsapp_saas
```

### Limpiar Todo (Peligroso)
Si necesitas borrar volúmenes (base de datos y sesiones) y arrancar desde cero absoluto:

```bash
# Detiene y borra contenedores y VOLÚMENES (-v)
docker-compose down -v

# Luego arranca de nuevo
docker-compose up -d --build
```
