// Redirect: /profile/:username/osu → /osu?user=:username
import { Navigate, useParams } from 'react-router-dom';

export default function OsuProfileRedirect() {
  const { username } = useParams();
  return <Navigate to={`/osu?user=${encodeURIComponent(username)}`} replace />;
}
