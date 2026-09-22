// Força a suíte de banco a usar somente a instância local com dados sintéticos.
process.env.DATABASE_URL =
  'postgresql://vers_test:vers_test_local_only@127.0.0.1:55432/vers_test?schema=public';
