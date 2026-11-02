import { init } from 'public/portal-pages/enquiries';
import { getSession } from 'backend/session';
import { listEnquiries, getEnquiry, replyToEnquiry, convertEnquiry, closeEnquiry } from 'backend/enquiries';

$w.onReady(() => init($w, { getSession, listEnquiries, getEnquiry, replyToEnquiry, convertEnquiry, closeEnquiry }));
