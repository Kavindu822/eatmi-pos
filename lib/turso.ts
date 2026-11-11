import { createClient, Client } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL || 'libsql://eatmi-pos-kavindu.aws-ap-south-1.turso.io';
const authToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTQ0MjA2MTYsImlkIjoiMDFhMWNiY2QtNWYwMS03ODhjLWIxN2QtZDg2NTBhMDZlYWQxIiwia2lkIjoidE9VYUdZdC1MdWxhMk9rengzblExQTNSc2RxVXcyTHIzb0YxRF82SnIzcyIsInJpZCI6ImU0NDM1OGVlLWQ3OTItNDkxZS05N2QwLTg2MjM0MmQ1NjlhNSJ9.8embmjgamJr5jo_2zHeRFNdHE5elUzkVcRHnt4CWyZaCinnlaWCNvrOcPfupAgbIDoVyfkNQQXniLHhaoYWnAg';

let _turso: Client | null = null;

export function getTursoClient(): Client {
  if (!_turso) {
    _turso = createClient({
      url,
      authToken
    });
  }
  return _turso;
}

