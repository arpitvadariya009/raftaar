
## 7. Auth Employee (Face Auth)

### Register Employee
```bash
curl -X POST http://localhost:1911/api/auth-employee/register \
-F "username=johndoe" \
-F "email=johndoe@example.com" \
-F "image=@/path/to/image.jpg"
```

### Get All Employees
```bash
curl -X GET "http://localhost:1911/api/auth-employee/all?page=1&limit=10"
```

### Face Login (Get Face Data)
```bash
curl -X POST http://localhost:1911/api/auth-employee/face-login \
-F "image=@/path/to/login_image.jpg"
```
