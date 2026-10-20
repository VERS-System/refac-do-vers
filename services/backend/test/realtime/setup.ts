// Impede execução acidental da suíte com alvos não autorizados e fixa o banco sintético.
if (process.env.VERS_REALTIME_REHEARSAL !== 'authorized-local-only') {
  throw new Error('Ensaio real exige autorização específica e VERS_REALTIME_REHEARSAL=authorized-local-only.');
}
process.env.DATABASE_URL = 'postgresql://vers_test:vers_test_local_only@127.0.0.1:55432/vers_test?schema=public';
