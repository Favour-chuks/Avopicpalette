import { Alert } from "@canva/app-ui-kit";

interface warningValues {
  tone: string;
  message: string;
  isclicked: boolean;
}
export default function Warn({ tone, message, isclicked }) {
  return <>{isclicked && <Alert tone={tone}>{message}</Alert>}</>;
}
