import os
import fnmatch


def analisar_e_escrever_arquivos(
    ignorar_nomes_pastas=None,
    ignorar_padroes_glob=None,
    ignorar_caminhos_relativos=None,
):
    """
    Percorre o diretório atual e suas subpastas em busca de arquivos
    com extensões específicas (.py, .html, .css, .js) e escreve seus
    caminhos e conteúdos em um arquivo de texto.

    Permite ignorar pastas:
      - por nome exato (ex.: {'node_modules', '.git', 'venv'})
      - por padrão glob (ex.: {'*.venv*', 'build*'})
      - por caminho relativo a partir da pasta raiz (ex.: {'projetos/arquivos/grandes'})
    """
    pasta_raiz = os.getcwd()

    # Normaliza parâmetros
    ignorar_nomes_pastas = set(ignorar_nomes_pastas or [])
    ignorar_padroes_glob = set(ignorar_padroes_glob or [])
    # Normaliza separadores e resolve caminhos relativos em relação à pasta raiz
    ignorar_caminhos_relativos = {
        os.path.normpath(os.path.join(pasta_raiz, p))
        for p in (ignorar_caminhos_relativos or set())
    }

    extensoes_desejadas = ('.py', '.html', '.css', '.js')
    arquivo_saida = 'conteudo_arquivos.txt'

    try:
        with open(arquivo_saida, 'w', encoding='utf-8') as saida:
            print(f"Analisando a partir de: {pasta_raiz}")
            print(f"Os resultados serão salvos em: {arquivo_saida}\n")

            for diretorio_atual, dirnames, arquivos in os.walk(pasta_raiz):
                # --- FILTRO DE PASTAS A SEREM IGNORADAS ---
                # Vamos modificar dirnames in-place para evitar descer nessas pastas.
                dirnames[:] = [
                    d for d in dirnames
                    if not deve_ignorar_pasta(
                        dir_nome=d,
                        dir_absoluto=os.path.join(diretorio_atual, d),
                        pasta_raiz=pasta_raiz,
                        ignorar_nomes_pastas=ignorar_nomes_pastas,
                        ignorar_padroes_glob=ignorar_padroes_glob,
                        ignorar_caminhos_absolutos=ignorar_caminhos_relativos
                    )
                ]

                for nome_arquivo in arquivos:
                    if nome_arquivo.endswith(extensoes_desejadas):
                        caminho_completo = os.path.join(
                            diretorio_atual, nome_arquivo)

                        saida.write(f"{caminho_completo}\n\n")

                        try:
                            with open(caminho_completo, 'r', encoding='utf-8', errors='ignore') as entrada:
                                conteudo = entrada.read()
                                saida.write(f"{conteudo}\n")
                        except Exception as e:
                            saida.write(
                                f"--- Erro ao ler o arquivo: {e} ---\n")

                        saida.write(
                            "_____________________________________\n\n")
                        print(f"Processado: {caminho_completo}")

        print(
            f"\nAnálise concluída com sucesso! Verifique o arquivo '{arquivo_saida}'.")

    except IOError as e:
        print(f"Erro ao escrever no arquivo de saída: {e}")
    except Exception as e:
        print(f"Ocorreu um erro inesperado: {e}")


def deve_ignorar_pasta(
    dir_nome: str,
    dir_absoluto: str,
    pasta_raiz: str,
    ignorar_nomes_pastas: set,
    ignorar_padroes_glob: set,
    ignorar_caminhos_absolutos: set,
) -> bool:
    """
    Retorna True se a pasta deve ser ignorada, com base em:
      - nome exato
      - padrões glob
      - caminho absoluto correspondente a caminhos relativos ignorados
    """
    # 1) Nome exato (case-sensitive; ajuste se quiser case-insensitive)
    if dir_nome in ignorar_nomes_pastas:
        return True

    # 2) Padrões glob (ex.: '*.venv*', 'build*')
    for padrao in ignorar_padroes_glob:
        if fnmatch.fnmatch(dir_nome, padrao):
            return True

    # 3) Caminhos absolutos específicos (derivados dos caminhos relativos)
    dir_absoluto_norm = os.path.normpath(dir_absoluto)

    # Ignora se a pasta atual é exatamente uma das listadas
    if dir_absoluto_norm in ignorar_caminhos_absolutos:
        return True

    # Ignora se a pasta atual está dentro de um caminho ignorado (subdiretório)
    for caminho_ignorado in ignorar_caminhos_absolutos:
        # Ex.: /raiz/projetos/arquivos/grandes é prefixo de /raiz/projetos/arquivos/grandes/imagens
        if dir_absoluto_norm.startswith(caminho_ignorado + os.sep):
            return True

    return False


if __name__ == '__main__':
    # EXEMPLO DE USO: ajuste conforme sua necessidade
    analisar_e_escrever_arquivos(
        ignorar_nomes_pastas={
            '__pycache__', 'migrations', '.git', 'venv', 'antigos', 'media',
        },
        ignorar_padroes_glob={
            '*.venv*', 'build*', '.gitattributes', '.txt'
        },
        ignorar_caminhos_relativos={
            # caminhos relativos a partir da pasta raiz
            # 'projetos/arquivos/grandes',
        }
    )
