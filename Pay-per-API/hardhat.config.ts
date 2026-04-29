rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default Deny
    match /{document=**} {
      allow read, write: if false;
    }

    // Connectivity Test path
    match /test/connection {
      allow read: if true;
    }

    // Helpers
    function isSignedIn() { return request.auth != null; }
    function isOwner(userId) { return isSignedIn() && request.auth.uid == userId; }

    // APIs: Public marketplace
    match /apis/{apiId} {
      allow read: if true;
      allow write: if false; // Sadece Admin veya sistem ekleyebilir (Firebase Console üzerinden)
    }

    // Users: Profiles and balances
    match /users/{userId} {
      allow read: if isOwner(userId);
      // İlk oluşturma: Sadece kendi profilini oluşturabilir ve başlangıç bakiyesi 5$ olmalı
      allow create: if isOwner(userId) && 
                      request.resource.data.balance == 5.0 &&
                      request.resource.data.uid == userId &&
                      request.resource.data.email is string &&
                      request.resource.data.email.size() < 256 &&
                      request.resource.data.createdAt == request.time;
      allow update: if false; // Bakiyeyi kullanıcı kendisi güncelleyemez! (Sunucu API'si üzerinden yapılır)
    }

    // Transactions: Private audit logs
    match /users/{userId}/transactions/{transactionId} {
      allow read: if isOwner(userId);
      allow write: if false; // System only
    }
  }
}
