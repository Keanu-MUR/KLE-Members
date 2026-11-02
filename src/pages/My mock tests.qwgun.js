// This page now lives in the one-page portal; send visitors there.
import { redirectToPortal } from 'public/portal-redirect';

$w.onReady(() => redirectToPortal('/pupil', 'mock-tests'));
