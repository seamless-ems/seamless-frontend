# Seamless EMS — Backend API Specification

This document describes the recommended FastAPI-compatible REST API, data schemas (Pydantic), and SQLAlchemy models that match the frontend needs in this repository (sems-frontend).

Contents
- Overview
- Authentication endpoints
- Event endpoints
- Speaker endpoints
- Speaker intake (public)
- Files / uploads
- Team / Invitations
- Subscription / Billing
- Settings / Profile
- Pydantic schemas (examples)
- SQLAlchemy models (examples)
- Endpoint <> Frontend mapping


## Overview
The frontend expects JSON-based REST endpoints for auth, event management, speakers, team management, subscription, and settings. Some flows require OAuth redirects (Google, Microsoft) and multipart file uploads (speaker headshots and company logos).

Auth: frontend uses `localStorage` access token helper but `fetch` calls use `credentials: "include"` in `src/lib/api.ts`. Choose either a token-based strategy (Bearer JWT) or cookie-based sessions. For best security, prefer HttpOnly cookies with CSRF protection.

Support pagination for list endpoints (events, speakers, files) and filtering via query params.


## Authentication
- POST /api/v1/oauth2/signup
  - body: SignupRequest
  - response: TokenSchema
- POST /api/v1/oauth2/login
  - body: LoginRequest
  - response: TokenSchema
- GET /api/v1/oauth2/logout
  - invalidates session or clears cookie
- GET /api/v1/google/login
  - Redirects to Google OAuth consent
- GET /api/v1/google/callback
  - OAuth callback
- GET /api/v1/microsoft/login
- GET /api/v1/microsoft/callback


## Events
- GET /api/v1/events
  - query: q, status (draft|active|completed), page, page_size, sort
  - response: Paginated list of EventSummary
- POST /api/v1/events
  - body: EventCreate
  - response: Event
- GET /api/v1/events/{event_id}
  - response: Event (full)
- PATCH /api/v1/events/{event_id}
  - body: EventUpdate (partial)
- DELETE /api/v1/events/{event_id}
- GET /api/v1/events/{event_id}/modules
- PATCH /api/v1/events/{event_id}/modules/{module_id}
  - body: { enabled: bool }
- POST /api/v1/events/{event_id}/google/connect
  - initiates Google OAuth for Drive access
- POST /api/v1/events/{event_id}/google/link
  - callback to store root folder and link status


## Speakers (event-scoped)
- GET /api/v1/events/{event_id}/speakers
  - query: q, intake_status (pending|submitted|approved), page, page_size
  - response: Paginated Speaker list
- POST /api/v1/events/{event_id}/speakers
  - body: SpeakerCreate (or accept minimal fields)
- GET /api/v1/events/{event_id}/speakers/{speaker_id}
- PATCH /api/v1/events/{event_id}/speakers/{speaker_id}
  - body: SpeakerUpdate (partial, actions like approve_website_card)
- DELETE /api/v1/events/{event_id}/speakers/{speaker_id}
- POST /api/v1/events/{event_id}/speakers/{speaker_id}/upload-headshot
- POST /api/v1/events/{event_id}/speakers/{speaker_id}/upload-company-logo
- GET /api/v1/events/{event_id}/speakers/{speaker_id}/assets
- GET /api/v1/events/{event_id}/speakers/{speaker_id}/embed
  - returns embed HTML / JS for website/promo cards
- POST /api/v1/events/{event_id}/speakers/{speaker_id}/send-reminder
- POST /api/v1/events/{event_id}/speakers/bulk-remind


## Speaker intake (public)
- POST /api/v1/events/{event_id}/intake
  - multipart/form-data: firstName, lastName, email, companyName, companyRole, bio, headshot (file), companyLogo (file)
  - response: { success: bool, speaker_id: uuid }
- GET /api/v1/events/{event_id}/intake/form-config
- PATCH /api/v1/events/{event_id}/intake/form-config  (admin)


## Files & Uploads
- POST /api/v1/uploads
  - multipart: file, owner_type (event|speaker|user), owner_id
  - response: UploadResponse { id, url, filename, size, content_type }
- GET /api/v1/uploads/{file_id}
- GET /api/v1/events/{event_id}/files
- GET /api/v1/events/{event_id}/files/{file_id}


## Team / Invitations
- GET /api/v1/account/team
- POST /api/v1/account/team/invite
  - body: { email, role }
- POST /api/v1/account/team/accept  (invite acceptance)
- PATCH /api/v1/account/team/{member_id}  (change role)
- DELETE /api/v1/account/team/{member_id}


## Subscription / Billing
- GET /api/v1/account/subscription
- POST /api/v1/account/subscription/change
  - body: { plan, billing_cycle, modules }
- GET /api/v1/account/billing/invoices
- POST /api/v1/account/billing/payment-method
- POST /api/v1/account/subscription/cancel


## Settings / Profile
- GET /api/v1/me
- PATCH /api/v1/me
- POST /api/v1/me/change-password
- GET /api/v1/account/settings
- PATCH /api/v1/account/settings


## Pydantic Schemas (examples)
Below are example Pydantic models you can use in FastAPI request/response validation.

```py
# schemas.py (examples)
from typing import List, Optional
from pydantic import BaseModel, EmailStr, AnyUrl
from datetime import date, datetime
from enum import Enum

class TokenSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserBase(BaseModel):
    id: str
    email: EmailStr
    first_name: Optional[str]
    last_name: Optional[str]
    avatar_url: Optional[AnyUrl]
    role: str

class EventModuleSchema(BaseModel):
    id: str
    name: str  # 'speaker' | 'schedule' | 'content' | 'attendee' | 'app'
    enabled: bool
    status: Optional[str]

class EventSummary(BaseModel):
    id: str
    title: str
    start_date: Optional[date]
    end_date: Optional[date]
    location: Optional[str]
    status: str
    speaker_count: int = 0
    attendee_count: int = 0
    google_drive_linked: bool = False

class EventCreate(BaseModel):
    title: str
    start_date: date
    end_date: Optional[date]
    location: Optional[str]
    modules: Optional[List[str]] = ["speaker"]
    from_email: Optional[EmailStr]
    reply_email: Optional[EmailStr]
    email_signature: Optional[str]
    google_drive_linked: bool = False
    root_folder: Optional[str]

class SpeakerBase(BaseModel):
    id: str
    name: str
    email: EmailStr
    title: Optional[str]
    company: Optional[str]
    headshot_url: Optional[AnyUrl]
    company_logo_url: Optional[AnyUrl]
    linkedin: Optional[AnyUrl]
    bio: Optional[str]
    intake_form_status: str
    website_card_approved: bool = False
    promo_card_approved: bool = False
    registered_at: Optional[datetime]

class SpeakerCreate(BaseModel):
    name: str
    email: EmailStr
    title: Optional[str]
    company: Optional[str]
    linkedin: Optional[AnyUrl]
    bio: Optional[str]

class TeamMember(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    avatar_url: Optional[AnyUrl]

class SubscriptionSchema(BaseModel):
    plan: str
    modules: List[str]
    billing_cycle: str
    next_billing_date: Optional[date]
    status: str

class UploadResponse(BaseModel):
    id: str
    url: AnyUrl
    filename: str
    size: int
    content_type: str
```


## SQLAlchemy models (high-level examples)
Below are simplified SQLAlchemy ORM definitions (conceptual). You should expand with indexes, constraints, migrations, and relationship backrefs.

```py
# models.py (simplified)
from sqlalchemy import Column, String, Integer, Boolean, Date, DateTime, ForeignKey, Enum, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    avatar_url = Column(String)
    role = Column(String, default="member")
    created_at = Column(DateTime)

class Event(Base):
    __tablename__ = "events"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    title = Column(String, nullable=False)
    start_date = Column(Date)
    end_date = Column(Date)
    location = Column(String)
    status = Column(String, default="draft")
    from_email = Column(String)
    reply_email = Column(String)
    email_signature = Column(Text)
    google_drive_linked = Column(Boolean, default=False)
    root_folder = Column(String)
    modules = Column(JSON)  # or create EventModule table

class Speaker(Base):
    __tablename__ = "speakers"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey("events.id"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    title = Column(String)
    company = Column(String)
    headshot_url = Column(String)
    company_logo_url = Column(String)
    linkedin = Column(String)
    bio = Column(Text)
    intake_form_status = Column(String, default="pending")
    website_card_approved = Column(Boolean, default=False)
    promo_card_approved = Column(Boolean, default=False)
    registered_at = Column(DateTime)

class Upload(Base):
    __tablename__ = "uploads"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_type = Column(String)  # event, speaker, user
    owner_id = Column(UUID(as_uuid=True))
    url = Column(String)
    filename = Column(String)
    size = Column(Integer)
    content_type = Column(String)
    created_at = Column(DateTime)
```


## Endpoint <> Frontend mapping (quick)
- Events list (`src/pages/Events.tsx`)
  - GET /api/v1/events
- Create event (`src/pages/CreateEvent.tsx`)
  - POST /api/v1/events
  - POST /api/v1/events/{id}/google/connect
- Event dashboard (`src/pages/EventDashboard.tsx`)
  - GET /api/v1/events/{id}
  - GET /api/v1/events/{id}/modules
- Speaker management (`src/pages/SpeakerModule.tsx`)
  - GET /api/v1/events/{id}/speakers
  - POST /api/v1/events/{id}/speakers
  - POST /api/v1/events/{id}/speakers/bulk-remind
- Speaker portal (`src/pages/SpeakerPortal.tsx`)
  - GET /api/v1/events/{id}/speakers/{speaker_id}
  - PATCH /api/v1/events/{id}/speakers/{speaker_id}
  - POST upload endpoints
- Speaker intake (`src/pages/SpeakerIntakeForm.tsx`)
  - POST /api/v1/events/{id}/intake (multipart)
- Team (`src/pages/Team.tsx`)
  - GET /api/v1/account/team
  - POST /api/v1/account/team/invite
- Subscription (`src/pages/Subscription.tsx`)
  - GET /api/v1/account/subscription
  - POST /api/v1/account/subscription/change
- Settings (`src/pages/Settings.tsx`)
  - GET /api/v1/me
  - PATCH /api/v1/me
