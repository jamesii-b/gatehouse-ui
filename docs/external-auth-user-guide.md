# External Authentication User Guide

## Overview

This guide explains how to configure and use external authentication providers (Google, GitHub, Microsoft) with Gatehouse. External authentication allows users to sign in using their existing accounts from these providers, eliminating the need to remember additional passwords.

---

## For Users

### Linking an External Account

1. **Navigate to Security Settings**
   - Go to **Settings** → **Security** in the Gatehouse application
   - Find the "Linked Accounts" section

2. **Connect Your Account**
   - Click **Connect** next to your desired provider (Google, GitHub, or Microsoft)
   - You will be redirected to the provider's login page
   - Sign in and grant permission to share your profile with Gatehouse

3. **Confirmation**
   - After successful authentication, you will see a confirmation message
   - Your account is now linked and can be used for future logins

### Logging In with External Accounts

1. **On the Login Page**
   - Click the "Sign in with Google" (or other provider) button
   - Alternatively, use the "Login with Google" option on the login form

2. **Authentication**
   - You will be redirected to the provider's login page
   - Sign in with your provider credentials
   - Grant permission if prompted

3. **Access Granted**
   - After successful authentication, you will be redirected back to Gatehouse
   - Your session will be created automatically

### Unlinking an External Account

1. **Go to Security Settings**
   - Navigate to **Settings** → **Security**
   - Find the "Linked Accounts" section

2. **Disconnect**
   - Click **Disconnect** next to the account you want to unlink
   - Confirm the action in the dialog

3. **Important Notes**
   - You must have at least one other authentication method linked
   - You cannot unlink your last authentication method
   - Consider adding a password or another method first

---

## For Administrators

### Configuring Google OAuth

#### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **OAuth consent screen**
4. Select **External** user type
5. Fill in the required information:
   - Application name
   - User support email
   - Application homepage link
   - Authorized redirect URI: `https://your-domain.com/api/v1/auth/external/google/callback`

#### Step 2: Create OAuth Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. Add your authorized redirect URI
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

#### Step 3: Configure in Gatehouse

1. Log in to Gatehouse as an organization admin
2. Navigate to **Settings** → **Authentication**
3. Find the Google OAuth section
4. Enter your Client ID and Client Secret
5. Configure optional settings:
   - **Hosted Domain**: Restrict to specific domain (e.g., `company.com`)
   - **Access Type**: `offline` to get refresh tokens
   - **Prompt**: `consent` to force re-consent
6. Add allowed redirect URIs
7. Click **Save**

#### Step 4: Verify Configuration

1. Try initiating a login flow
2. Ensure the OAuth consent screen displays correctly
3. Test account linking from a user account

---

### Configuring GitHub OAuth

#### Step 1: Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in the application details:
   - **Application name**: Gatehouse (or your custom name)
   - **Homepage URL**: `https://your-domain.com`
   - **Authorization callback URL**: `https://your-domain.com/api/v1/auth/external/github/callback`
4. Click **Register application**
5. Copy the **Client ID** and generate a **Client Secret**

#### Step 2: Configure in Gatehouse

1. Log in to Gatehouse as an organization admin
2. Navigate to **Settings** → **Authentication**
3. Find the GitHub OAuth section
4. Enter your Client ID and Client Secret
5. Add allowed redirect URIs
6. Click **Save**

---

### Configuring Microsoft OAuth

#### Step 1: Register an Application in Azure AD

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: Gatehouse (or custom name)
   - **Supported account types**: Choose based on your needs
   - **Redirect URI**: Select Web and add `https://your-domain.com/api/v1/auth/external/microsoft/callback`
5. Click **Register**
6. Note the **Application (client) ID**
7. Navigate to **Certificates & secrets**
8. Create a new client secret
9. Copy the secret value (not the ID)

#### Step 2: Configure in Gatehouse

1. Log in to Gatehouse as an organization admin
2. Navigate to **Settings** → **Authentication**
3. Find the Microsoft OAuth section
4. Enter your Client ID and Client Secret
5. Add allowed redirect URIs
6. Click **Save**

---

### Managing Provider Settings

#### Viewing Provider Status

1. Navigate to **Settings** → **Authentication**
2. View the status of each provider:
   - **Configured**: Credentials are set up
   - **Active**: Provider is enabled for use
   - **Not Configured**: Needs setup

#### Updating Configuration

1. Click **Edit** on the provider you want to update
2. Modify the settings as needed
3. Click **Save** to apply changes

#### Disabling a Provider

1. Click **Edit** on the provider
2. Toggle **Enable Provider** to off
3. Click **Save**
4. Users will no longer be able to use this provider

#### Deleting Configuration

1. Click **Delete** on the provider
2. Confirm the deletion
3. All linked accounts remain but users cannot link new accounts

---

## Troubleshooting Common Issues

### "Google login is not available"

**Cause**: Provider not configured or disabled

**Solution**:
1. Check if Google OAuth is configured in settings
2. Verify credentials are correct
3. Ensure provider is enabled

### "OAuth session expired"

**Cause**: State parameter expired (10-minute timeout)

**Solution**:
1. Try the login/link flow again
2. Complete the flow within 10 minutes of initiation

### "Redirect URI mismatch" error from provider

**Cause**: Redirect URI in provider console doesn't match Gatehouse configuration

**Solution**:
1. Verify redirect URI in provider's console
2. Ensure it matches exactly (including trailing slash)
3. Common format: `https://your-domain.com/api/v1/auth/external/google/callback`

### "Email already exists" when registering

**Cause**: Another Gatehouse account uses the same email

**Solution**:
1. Login with your existing Gatehouse account
2. Link the external account from settings instead
3. Or use a different email with the external provider

### Cannot unlink account

**Cause**: It's your last authentication method

**Solution**:
1. Add another authentication method first (password, TOTP, etc.)
2. Then you can unlink the external account

### "Access denied" from Google/Microsoft

**Cause**: User denied permission during consent

**Solution**:
1. Ask user to try again
2. User should ensure they grant all requested permissions

---

## Security Best Practices

### For Users

1. **Review permissions** before granting access
2. **Disconnect unused accounts** to reduce attack surface
3. **Enable MFA** on your external provider accounts
4. **Use unique emails** for different services when possible

### For Administrators

1. **Limit authorized domains** to your organization's domain
2. **Review linked accounts** periodically
3. **Monitor audit logs** for suspicious activity
4. **Rotate credentials** regularly
5. **Keep redirect URIs up to date**
6. **Enable rate limiting** to prevent abuse

---

## FAQ

### Can I link multiple accounts from the same provider?

Yes, you can link multiple Google/GitHub/Microsoft accounts, each with a different email address.

### What happens if I change my external provider password?

Nothing changes - your Gatehouse account remains linked. You can continue logging in with the external provider.

### Can I use external auth without a password?

Yes, once you link an external account, you can use it as your primary authentication method.

### Will external auth work if the provider is down?

No, if the external provider (Google, GitHub, Microsoft) is experiencing an outage, users won't be able to authenticate using that provider.

### Can I use external auth for SSO across organizations?

External auth is per-organization. Each organization can configure their own provider credentials.

### How are my tokens stored?

Provider tokens (access tokens, refresh tokens) are encrypted at rest using industry-standard encryption.

### Can I link an account with a different email?

Yes, but note:
- The external account's email will be associated with your Gatehouse account
- You can have multiple linked accounts with different emails

---

## Support

For issues not covered in this guide:

- Check the [API Documentation](../api/external-auth-api.md)
- Review the [Architecture Documentation](../architecture/external-auth-architecture.md)
- Contact your organization administrator
- Check application logs for detailed error messages

---

*Last Updated: 2024-01-20*
*Gatehouse Identity Platform*
