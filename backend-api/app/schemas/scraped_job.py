from pydantic import BaseModel


class ScrapedJob(BaseModel):
    title: str
    company: str
    location: str = "India"
    salary: str | None = None
    applyUrl: str
    source: str
    description: str | None = None
    employmentType: str | None = None
