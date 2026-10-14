/**
 * Estados de uma consulta de dados nas telas do VERS: carregando, erro e
 * sucesso.
 *
 * Cada card das telas lê seus dados por um hook do TanStack Query. Em vez de
 * repetir o mesmo `if (isPending) … if (isError) …` em todos eles, o card
 * envolve o conteúdo em `EstadoConsulta`, que mostra um esqueleto enquanto
 * carrega, uma mensagem com "Tentar de novo" se falhar, e entrega os dados ao
 * conteúdo quando chegam.
 */

import type { ReactNode } from 'react';
import { RotateCw } from 'lucide-react';
import { Button } from './Button';
import { Skeleton } from './Skeleton';

/** O mínimo de uma consulta do TanStack Query que este componente usa. */
export interface ConsultaBasica<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => unknown;
}

export interface EstadoErroProps {
  mensagem: string;
  onTentarNovamente: () => void;
}

/**
 * Mensagem de erro com o botão "Tentar de novo".
 *
 * Usa `role="alert"` para que leitores de tela anunciem a falha assim que ela
 * aparece, já que o usuário não pediu nada para vê-la.
 */
export function EstadoErro({ mensagem, onTentarNovamente }: EstadoErroProps) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3">
      <p className="text-[13px] leading-[18px] text-danger">{mensagem}</p>
      <Button variant="secondary" icon={RotateCw} onClick={onTentarNovamente}>
        Tentar de novo
      </Button>
    </div>
  );
}

export interface EstadoConsultaProps<T> {
  consulta: ConsultaBasica<T>;
  /** Nome do dado com artigo, para a mensagem de erro ("a vibração"). */
  nome: string;
  /** Esqueleto no formato do conteúdo; o padrão é um bloco genérico. */
  carregando?: ReactNode;
  /** Conteúdo desenhado com os dados já carregados. */
  children: (dados: T) => ReactNode;
}

/**
 * Escolhe o que mostrar conforme o estado da consulta.
 *
 * Carregando, o esqueleto fica num contêiner com `aria-busy`, que avisa às
 * tecnologias assistivas que a área ainda vai mudar. O erro tem prioridade
 * sobre dados antigos do cache, para não exibir números desatualizados como
 * se fossem atuais.
 */
export function EstadoConsulta<T>({ consulta, nome, carregando, children }: EstadoConsultaProps<T>) {
  if (consulta.isError) {
    return (
      <EstadoErro mensagem={`Não foi possível carregar ${nome}.`} onTentarNovamente={() => void consulta.refetch()} />
    );
  }
  if (consulta.isPending || consulta.data === undefined) {
    return <div aria-busy="true">{carregando ?? <Skeleton className="h-10 w-full" />}</div>;
  }
  return <>{children(consulta.data)}</>;
}
