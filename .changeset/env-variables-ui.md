---
"@openqa/cli": minor
---

**Environment Variables Management UI**

Added a complete web-based interface for managing environment variables directly from the dashboard, eliminating the need to manually edit `.env` files.

**New Features:**

1. **Web Interface** (`/config/env`)
   - Beautiful, categorized UI for all environment variables
   - 8 categories: LLM, Security, Target App, GitHub, Web Server, Agent, Database, Notifications
   - Real-time validation with error messages
   - Masked display for sensitive values (passwords, API keys)
   - Responsive design with tabs for easy navigation

2. **API Endpoints** (`/api/env/*`)
   - `GET /api/env` - List all environment variables
   - `GET /api/env/:key` - Get specific variable
   - `PUT /api/env/:key` - Update single variable
   - `POST /api/env/bulk` - Update multiple variables
   - `POST /api/env/test/:key` - Test API keys/URLs
   - `POST /api/env/generate/:key` - Generate secrets

3. **Validation System**
   - Real-time validation for all inputs
   - Type-specific validation (URL, number, boolean, select)
   - Custom validators for API keys, tokens, webhooks
   - Required field enforcement

4. **Testing Functionality**
   - Test OpenAI API keys
   - Test Anthropic API keys
   - Test Ollama server connectivity
   - Test GitHub tokens
   - Test Slack/Discord webhooks
   - Test target application URLs

5. **Security Features**
   - Admin-only access (requires authentication)
   - Sensitive values masked in UI
   - Password-type inputs for secrets
   - Validation prevents dangerous configurations
   - Auto-generated JWT secrets

6. **User Experience**
   - One-click secret generation
   - Bulk save with single click
   - Restart warnings when needed
   - Success/error notifications
   - Tooltips and descriptions for each variable
   - Placeholder examples

**Technical Details:**

- **Files Added:**
  - `cli/env-config.ts` - Schema and validation logic
  - `cli/env-routes.ts` - API endpoints
  - `cli/env.html.ts` - Web interface
  
- **Integration:**
  - Integrated in both `server.ts` and `daemon.ts`
  - Accessible at `/config/env`
  - Protected by authentication middleware
  
- **Supported Variables:** 30+ environment variables across 8 categories

**Benefits:**

- ✅ No need to SSH into server to edit `.env`
- ✅ No risk of syntax errors in `.env` file
- ✅ Immediate validation feedback
- ✅ Test configurations before saving
- ✅ Better UX for non-technical users
- ✅ Centralized configuration management
