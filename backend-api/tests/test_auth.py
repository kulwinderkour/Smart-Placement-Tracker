def test_register_success(client):
    res = client.post(
        "/api/v1/auth/register",
        json={"email": "student@test.com", "password": "password123", "role": "student"},
    )
    assert res.status_code == 201
    assert res.json()["email"] == "student@test.com"


def test_register_duplicate_email(client):
    client.post(
        "/api/v1/auth/register",
        json={"email": "dup@test.com", "password": "pass123", "role": "student"},
    )
    res = client.post(
        "/api/v1/auth/register",
        json={"email": "dup@test.com", "password": "pass123", "role": "student"},
    )
    assert res.status_code == 400


def test_login_success(client):
    client.post(
        "/api/v1/auth/register",
        json={"email": "login@test.com", "password": "pass123", "role": "student"},
    )
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "login@test.com", "password": "pass123"},
    )
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_wrong_password(client):
    client.post(
        "/api/v1/auth/register",
        json={"email": "wp@test.com", "password": "correct", "role": "student"},
    )
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "wp@test.com", "password": "wrong"},
    )
    assert res.status_code == 401


def test_me_with_valid_token(client):
    client.post(
        "/api/v1/auth/register",
        json={"email": "me@test.com", "password": "pass123", "role": "student"},
    )
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "me@test.com", "password": "pass123"},
    )
    token = login.json()["access_token"]
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email"] == "me@test.com"


def test_me_without_token(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 403
