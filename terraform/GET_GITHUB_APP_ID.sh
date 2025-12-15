#!/bin/bash
# Script to get GitHub App installation ID

echo "To get your GitHub App Installation ID:"
echo ""
echo "1. Go to: https://github.com/settings/installations"
echo "2. Click 'Configure' next to 'Google Cloud Build'"
echo "3. The URL will contain the installation ID: https://github.com/settings/installations/INSTALLATION_ID"
echo ""
echo "Or use GitHub API:"
echo ""
echo "curl -H 'Authorization: token YOUR_GITHUB_TOKEN' https://api.github.com/users/pbuchman/installation | jq .id"
echo ""
echo "Once you have it, run:"
echo "echo 'github_app_installation_id = \"YOUR_ID\"' >> terraform/environments/dev/terraform.tfvars"

