import { toast } from 'sonner';

export function showSuccess(message) {
  toast.success(message);
}

export function showError(message) {
  toast.error(message);
}

const INVITE_TOAST_DURATION = 10000;

export function showInviteCreated({ email, inviteUrl, emailSent }) {
  if (emailSent) {
    toast.success(`Invite sent to ${email}`, { duration: INVITE_TOAST_DURATION });
    return;
  }

  toast.success(`Invite created for ${email}`, {
    description: 'Copy the link if email is not configured.',
    action: {
      label: 'Copy link',
      onClick: () => {
        navigator.clipboard.writeText(inviteUrl);
        toast.success('Link copied');
      },
    },
    duration: INVITE_TOAST_DURATION,
  });
}
