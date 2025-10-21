#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Function to check if a command exists
command_exists () {
  type "$1" &> /dev/null ;
}

# Check for Supabase CLI
if ! command_exists supabase; then
  echo "Supabase CLI not found. Please install it first: https://supabase.com/docs/guides/cli"
  exit 1
fi

# Check if we are inside a Supabase project
if [ ! -d "supabase" ]; then
  echo "Not a Supabase project. Make sure you are in the root of your project directory."
  exit 1
fi

# Generate types
echo "Generating Supabase types..."
supabase gen types typescript --local > src/integrations/supabase/types.ts

echo "Supabase types generated successfully!"
