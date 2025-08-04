# TypeScript Node.js Projesi

Modern TypeScript ve Node.js kullanarak oluşturulmuş bir API projesi. MongoDB, Redis ve RabbitMQ desteği ile birlikte gelir.

## 🚀 Kurulum

### Yerel Geliştirme

```bash
# Bağımlılıkları yükle
npm install

# Environment dosyasını oluştur
cp env.example .env

# Geliştirme modunda çalıştır
npm run dev

# Production build
npm run build
npm start
```

### Docker ile Çalıştırma

#### Sadece Veritabanları
```bash
# MongoDB, Redis ve RabbitMQ'yu başlat
docker-compose up -d

# Web UI'larına erişim:
# MongoDB Express: http://localhost:8081 (admin/admin123)
# Redis Commander: http://localhost:8082
# RabbitMQ Management: http://localhost:15672 (admin/admin123)
```

#### Tüm Uygulama (App + Veritabanları)
```bash
# Tüm servisleri başlat
docker-compose -f docker-compose.app.yml up -d

# Uygulamaya erişim: http://localhost:3000
# Socket.IO Test: http://localhost:3000

## 📝 Kullanılabilir Scriptler

- `npm run dev` - Geliştirme modunda çalıştırır
- `npm run dev:watch` - Dosya değişikliklerini izleyerek çalıştırır
- `npm run build` - TypeScript'i JavaScript'e derler
- `npm start` - Production modunda çalıştırır
- `npm test` - Testleri çalıştırır
- `npm run lint` - Kod kalitesini kontrol eder

## 🌐 API Endpoints

### Temel Endpoints
- `GET /` - Ana sayfa
- `GET /health` - Sağlık kontrolü
- `GET /api/hello` - Test endpoint'i

### Redis Endpoints
- `GET /api/redis/status` - Redis bağlantı durumu
- `GET /api/redis/ping` - Redis ping testi
- `POST /api/redis/set` - Redis'e değer kaydet
- `GET /api/redis/get/:key` - Redis'ten değer al
- `DELETE /api/redis/delete/:key` - Redis'ten değer sil
- `GET /api/redis/exists/:key` - Değer var mı kontrol et
- `POST /api/redis/expire/:key` - TTL ayarla

#### Online Kullanıcı Durumu
- `GET /api/redis/online/count` - Anlık online kullanıcı sayısı
- `GET /api/redis/online/status/:userId` - Belirli kullanıcının online durumu
- `GET /api/redis/online/users` - Tüm online kullanıcı ID'leri listesi

### RabbitMQ Endpoints
- `GET /api/rabbitmq/status` - RabbitMQ bağlantı durumu
- `POST /api/rabbitmq/queue` - Queue oluştur
- `GET /api/rabbitmq/queue/:queueName` - Queue bilgisi al
- `DELETE /api/rabbitmq/queue/:queueName` - Queue sil
- `DELETE /api/rabbitmq/queue/:queueName/purge` - Queue temizle
- `POST /api/rabbitmq/publish` - Mesaj gönder
- `POST /api/rabbitmq/publish/batch` - Batch mesaj gönder
- `POST /api/rabbitmq/consume/:queueName` - Mesaj dinlemeye başla

### MongoDB Endpoints
- `GET /api/mongodb/status` - MongoDB bağlantı durumu
- `GET /api/mongodb/collections` - Veritabanı koleksiyonları
- `GET /api/mongodb/stats` - Veritabanı istatistikleri
- `GET /api/mongodb/collection/:collectionName/stats` - Koleksiyon istatistikleri
- `POST /api/mongodb/users` - Kullanıcı oluştur
- `GET /api/mongodb/users` - Kullanıcıları listele
- `POST /api/mongodb/conversations` - Konuşma oluştur
- `GET /api/mongodb/conversations` - Konuşmaları listele
- `POST /api/mongodb/messages` - Mesaj oluştur
- `GET /api/mongodb/conversations/:conversationId/messages` - Mesajları listele
- `POST /api/mongodb/auto-messages` - Otomatik mesaj oluştur
- `GET /api/mongodb/auto-messages` - Otomatik mesajları listele

### Authentication Endpoints
- `POST /api/auth/register` - Yeni kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı giriş işlemi
- `POST /api/auth/refresh` - Access token yenileme
- `POST /api/auth/logout` - Kullanıcı çıkış işlemi
- `GET /api/auth/me` - Kullanıcı profil bilgilerini görüntüleme (Auth gerekli)
- `GET /api/auth/user/list` - Sistemdeki kullanıcıları listeleme (Auth gerekli)

### Messaging Endpoints
#### Mesaj Yönetimi
- `POST /api/messages/send` - Mesaj gönderme (Auth gerekli)
- `GET /api/messages/conversation/:conversationId` - Konuşma mesajlarını getirme (Auth gerekli)
- `PUT /api/messages/:messageId` - Mesaj güncelleme (Auth gerekli)
- `DELETE /api/messages/:messageId` - Mesaj silme (Auth gerekli)
- `PATCH /api/messages/:messageId/status` - Mesaj durumu güncelleme (Auth gerekli)
- `GET /api/messages/search` - Mesaj arama (Auth gerekli)

#### Konuşma Yönetimi
- `POST /api/messages/conversations` - Yeni konuşma oluşturma (Auth gerekli)
- `GET /api/messages/conversations` - Kullanıcının konuşmalarını listeleme (Auth gerekli)
- `GET /api/messages/conversations/:conversationId` - Konuşma detaylarını getirme (Auth gerekli)
- `PUT /api/messages/conversations/:conversationId` - Konuşma güncelleme (Auth gerekli)
- `POST /api/messages/conversations/:conversationId/participants` - Konuşmaya katılımcı ekleme (Auth gerekli)
- `DELETE /api/messages/conversations/:conversationId/participants` - Konuşmadan katılımcı çıkarma (Auth gerekli)
- `DELETE /api/messages/conversations/:conversationId` - Konuşma silme (Auth gerekli)

### Socket.IO Endpoints
- `GET /api/socket/status` - Socket.IO durumu
- `GET /api/socket/connected-users` - Bağlı kullanıcılar (Admin)
- `GET /api/socket/user/:userId/rooms` - Kullanıcının odaları
- `GET /api/socket/user/:userId/online` - Kullanıcı online durumu
- `GET /api/socket/typing/:conversationId` - Konuşmada yazan kullanıcılar (Admin)
- `POST /api/socket/system-message` - Sistem mesajı gönderme (Admin)
- `POST /api/socket/private-message` - Özel mesaj gönderme (Admin)
- `POST /api/socket/broadcast` - Broadcast mesajı gönderme (Admin)

### AutoMessage & Queue Management Endpoints
- `GET /api/auto-messages/stats` - Otomatik mesaj istatistikleri
- `POST /api/auto-messages` - Otomatik mesaj oluşturma (Auth gerekli)
- `GET /api/auto-messages` - Otomatik mesajları listeleme (Auth gerekli)
- `GET /api/auto-messages/:autoMessageId` - Otomatik mesaj detayı (Auth gerekli)
- `PUT /api/auto-messages/:autoMessageId` - Otomatik mesaj güncelleme (Auth gerekli)
- `DELETE /api/auto-messages/:autoMessageId` - Otomatik mesaj silme (Auth gerekli)
- `POST /api/auto-messages/:autoMessageId/trigger` - Manuel tetikleme (Auth gerekli)

### Message Planning Service Endpoints
- `GET /api/planning/status` - Planlama servisi durumu (Auth gerekli)
- `POST /api/planning/trigger` - Manuel tetikleme (Auth gerekli)
- `POST /api/planning/stop` - Servisi durdur (Auth gerekli)
- `POST /api/planning/start` - Servisi başlat (Auth gerekli)

### RabbitMQ Queue Management Endpoints
- `GET /api/rabbitmq/auto-queue/status` - Otomatik mesaj kuyruğu durumu
- `GET /api/rabbitmq/cron/status` - Cron servisi durumu
- `POST /api/rabbitmq/cron/trigger` - Cron servisi manuel tetikleme
- `POST /api/rabbitmq/cron/stop` - Cron servisi durdur
- `POST /api/rabbitmq/cron/start` - Cron servisi başlat

### Socket.IO Events
#### Client → Server
- `connection` - Kullanıcının sisteme bağlanması
- `join_room` - Belirli bir konuşma odasına katılma
- `send_message` - Gerçek zamanlı mesaj gönderme
- `typing` - Yazma durumu bildirimi (`{conversationId, isTyping}`)
- `message_received` - Mesaj alındı bildirimi
- `message_read` - Mesaj okundu bildirimi
- `leave_room` - Odadan ayrılma
- `disconnect` - Kullanıcının sistemden ayrılması

#### Server → Client
- `connection` - Bağlantı onayı
- `user_online` - Kullanıcının online durumu bildirimi
- `user_offline` - Kullanıcının offline durumu bildirimi
- `room_joined` - Odaya katılma onayı
- `user_joined_room` - Başka kullanıcının odaya katılması
- `user_left_room` - Başka kullanıcının odadan ayrılması
- `new_message` - Yeni mesaj bildirimi
- `message_sent` - Mesaj gönderme onayı
- `message_received` - Mesaj alma onayı
- `message_read` - Mesaj okundu onayı
- `user_typing` - Kullanıcı yazma durumu (`{userId, username, conversationId, isTyping, timestamp}`)
- `system_message` - Sistem mesajı
- `private_message` - Özel mesaj
- `broadcast_message` - Broadcast mesajı
- `error` - Hata bildirimi

#### Mesaj Durumları
- `sent` - Mesaj gönderildi
- `delivered` - Mesaj alındı
- `read` - Mesaj okundu

## 🔴 Redis Online Kullanıcı Takibi

Sistem, Socket.IO bağlantıları üzerinden kullanıcıların online durumlarını Redis Set veri yapısında gerçek zamanlı olarak takip eder.

### Nasıl Çalışır?
1. **Kullanıcı Bağlandığında**: JWT token doğrulaması başarılı olan kullanıcının ID'si Redis'teki `online_users` Set'ine eklenir
2. **Kullanıcı Ayrıldığında**: Kullanıcının ID'si Redis'teki `online_users` Set'inden çıkarılır
3. **Gerçek Zamanlı Bildirimler**: Diğer kullanıcılara online/offline durumu Socket.IO üzerinden broadcast edilir

### API Endpoints
- `GET /api/redis/online/count` - Anlık online kullanıcı sayısını döndürür
- `GET /api/redis/online/status/:userId` - Belirli bir kullanıcının online durumunu kontrol eder
- `GET /api/redis/online/users` - Tüm online kullanıcı ID'lerini listeler

### Socket.IO Events
- `user_online` - Kullanıcı online olduğunda diğer kullanıcılara gönderilir
- `user_offline` - Kullanıcı offline olduğunda diğer kullanıcılara gönderilir

## 🔧 Gereksinimler

- Node.js >= 18.0.0
- npm veya yarn
- Docker ve Docker Compose (opsiyonel)

## 📁 Proje Yapısı

```
src/
├── index.ts          # Ana uygulama dosyası
├── services/         # Servis katmanı (Redis, RabbitMQ, MongoDB)
├── models/           # MongoDB veri modelleri
├── controllers/      # Controller katmanı
├── routes/           # Route tanımları
├── types/            # TypeScript tip tanımları
└── utils/            # Yardımcı fonksiyonlar
```

## 🐳 Docker Servisleri

### Veritabanları
- **MongoDB**: 27017 (Web UI: 8081)
- **Redis**: 6379 (Web UI: 8082)
- **RabbitMQ**: 5672 (Web UI: 15672)

### Erişim Bilgileri
- **MongoDB**: admin/admin123
- **Redis**: redis123 (şifre)
- **RabbitMQ**: admin/admin123 