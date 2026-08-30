import ResetPasswordForm from '../component/login/ResetPasswordForm';

/**
 * Unlike its siblings this does NOT bounce a signed-in visitor: the link is
 * opened from an email, possibly on a device where an old session is still
 * cached, and the reset must still be allowed to proceed. It revokes every
 * token server-side anyway, so that stale session ends either way.
 */
const ResetPasswordRoute = () => <ResetPasswordForm />;

export default ResetPasswordRoute;
