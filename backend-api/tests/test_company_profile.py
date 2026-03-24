"""Tests for the company profile create/read/submit flow."""


def make_provider(client):
    """Register and login as a provider, return auth headers + login data."""
    client.post(
        "/api/v1/auth/register",
        json={"email": "company@test.com", "password": "pass123", "role": "provider"},
    )
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "company@test.com", "password": "pass123"},
    )
    data = login.json()
    token = data["access_token"]
    return {"Authorization": f"Bearer {token}"}, data


def test_provider_login_contains_completion_flag(client):
    """Login response for a provider should include is_company_profile_completed=false."""
    headers, data = make_provider(client)
    assert "role" in data
    assert data["role"] == "provider"
    assert "is_company_profile_completed" in data
    assert data["is_company_profile_completed"] is False


def test_get_profile_not_found(client):
    """Before any profile is created, GET should return 404."""
    headers, _ = make_provider(client)
    res = client.get("/api/v1/company/profile", headers=headers)
    assert res.status_code == 404


def test_save_as_draft(client):
    """POST with submit=false should create a draft and NOT flip the completion flag."""
    headers, _ = make_provider(client)
    res = client.post(
        "/api/v1/company/profile",
        json={
            "company_name": "Test Corp",
            "website": "https://test.com",
            "submit": False,
        },
        headers=headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["company_name"] == "Test Corp"
    assert body["is_draft"] is True

    # Login again — flag should still be false
    login2 = client.post(
        "/api/v1/auth/login",
        json={"email": "company@test.com", "password": "pass123"},
    )
    assert login2.json()["is_company_profile_completed"] is False


def test_submit_profile_flips_flag(client):
    """POST with submit=true should complete the profile and flip the flag."""
    headers, _ = make_provider(client)
    res = client.post(
        "/api/v1/company/profile",
        json={
            "company_name": "Finished Corp",
            "industry_type": "information_technology",
            "submit": True,
        },
        headers=headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["is_draft"] is False

    # Login again — flag must now be true
    login2 = client.post(
        "/api/v1/auth/login",
        json={"email": "company@test.com", "password": "pass123"},
    )
    assert login2.json()["is_company_profile_completed"] is True


def test_get_profile_after_submit(client):
    """After submitting, GET /company/profile should return the full profile."""
    headers, _ = make_provider(client)
    client.post(
        "/api/v1/company/profile",
        json={"company_name": "Readable Corp", "submit": True},
        headers=headers,
    )
    res = client.get("/api/v1/company/profile", headers=headers)
    assert res.status_code == 200
    assert res.json()["company_name"] == "Readable Corp"


def test_upsert_updates_existing_profile(client):
    """A second POST should update the existing profile, not create a duplicate."""
    headers, _ = make_provider(client)
    client.post(
        "/api/v1/company/profile",
        json={"company_name": "Old Name", "submit": False},
        headers=headers,
    )
    res = client.post(
        "/api/v1/company/profile",
        json={"company_name": "New Name", "submit": False},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["company_name"] == "New Name"


def test_non_provider_cannot_access_company_profile(client):
    """A student user must not be able to access company profile endpoints."""
    client.post(
        "/api/v1/auth/register",
        json={"email": "student2@test.com", "password": "pass123", "role": "student"},
    )
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "student2@test.com", "password": "pass123"},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/company/profile", headers=headers)
    assert res.status_code == 403

    res = client.post(
        "/api/v1/company/profile",
        json={"company_name": "Hack Corp", "submit": False},
        headers=headers,
    )
    assert res.status_code == 403
