-- Phase 1: Database Schema Enhancement

-- Create registration_status enum
CREATE TYPE public.registration_status AS ENUM (
    'registered',
    'cancelled', 
    'pending',
    'refunded',
    'waitlisted'
);

-- Add new columns to attendees table
ALTER TABLE public.attendees 
ADD COLUMN registration_status public.registration_status NOT NULL DEFAULT 'registered',
ADD COLUMN is_veteran boolean DEFAULT false,
ADD COLUMN military_branch text,
ADD COLUMN veteran_thanked_at timestamp with time zone;

-- Create index for registration status filtering
CREATE INDEX idx_attendees_registration_status ON public.attendees(registration_status);

-- Create index for veteran status
CREATE INDEX idx_attendees_is_veteran ON public.attendees(is_veteran) WHERE is_veteran = true;