interface Telemetry {
  id: string;
  timestamp: string;
  tensao: number;
  corrente: number;
  potencia: number;
}

interface Props {
  data: Telemetry[];
}

export default function TelemetryTable({ data }: Props) {
  return (
    <table className="w-full text-left">
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>Tensão (V)</th>
          <th>Corrente (A)</th>
          <th>Potência (W)</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.id}>
            <td>{row.timestamp}</td>
            <td>{row.tensao}</td>
            <td>{row.corrente}</td>
            <td>{row.potencia}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
