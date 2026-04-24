import argparse
import glob
import json
from pathlib import Path

import pandas as pd

COLUNAS = ["Codigo", "Unidade", "Descricao", "Preco_Unitario", "Preco_A_Vista", "Status"]


def ler_csv_com_fallback(arquivo: str) -> pd.DataFrame:
    for encoding in ("utf-8", "latin1", "cp1252"):
        try:
            return pd.read_csv(
                arquivo,
                sep=";",
                skiprows=3,
                header=None,
                encoding=encoding,
                on_bad_lines="skip",
                dtype=str,
            )
        except UnicodeDecodeError:
            continue

    raise ValueError(f"Nao foi possivel ler '{arquivo}' com as codificacoes suportadas.")


def limpar_tabela(df: pd.DataFrame) -> pd.DataFrame:
    df = df.iloc[:, : len(COLUNAS)]
    df.columns = COLUNAS[: len(df.columns)]

    for coluna in COLUNAS:
        if coluna not in df.columns:
            df[coluna] = None

    df = df[COLUNAS]
    df["Codigo"] = df["Codigo"].astype("string").str.strip()
    df = df[df["Codigo"].str.fullmatch(r"\d+", na=False)]
    return df


def normalizar_valor(valor):
    if pd.isna(valor):
        return None
    if isinstance(valor, str):
        valor = valor.strip()
        return valor if valor else None
    return valor


def carregar_catalogo(pasta_csv: Path) -> pd.DataFrame:
    arquivos_csv = sorted(glob.glob(str(pasta_csv / "*.csv")))
    if not arquivos_csv:
        raise FileNotFoundError(
            f"Nenhum CSV encontrado em '{pasta_csv}'. Verifique se a pasta existe e contem os arquivos."
        )

    tabelas = []
    for arquivo in arquivos_csv:
        tabela = limpar_tabela(ler_csv_com_fallback(arquivo))
        if not tabela.empty:
            tabelas.append(tabela)

    if not tabelas:
        raise ValueError("Nenhuma linha valida foi encontrada nos CSVs para gerar o catalogo.")

    return pd.concat(tabelas, ignore_index=True)


def exportar_catalogo(df: pd.DataFrame, output_json: Path, output_csv: Path) -> None:
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    output_json.parent.mkdir(parents=True, exist_ok=True)

    df_limpo = df.copy()
    for coluna in COLUNAS:
        df_limpo[coluna] = df_limpo[coluna].map(normalizar_valor)

    df_limpo.to_csv(output_csv, index=False, sep=";", encoding="utf-8")

    registros = [
        {coluna: normalizar_valor(linha[coluna]) for coluna in COLUNAS}
        for _, linha in df_limpo.iterrows()
    ]

    with output_json.open("w", encoding="utf-8") as arquivo_json:
        # allow_nan=False garante JSON valido para qualquer pipeline de deploy.
        json.dump(registros, arquivo_json, ensure_ascii=False, indent=2, allow_nan=False)


def main() -> None:
    base_dir = Path(__file__).resolve().parent

    parser = argparse.ArgumentParser(description="Consolida o Livro Atacado em JSON e CSV prontos para deploy.")
    parser.add_argument("--input-dir", default=str(base_dir / "Livro Atacado"), help="Pasta com os CSVs de origem.")
    parser.add_argument(
        "--json-output",
        default=str(base_dir / "catalogo_completo.json"),
        help="Arquivo de saida JSON consolidado.",
    )
    parser.add_argument(
        "--csv-output",
        default=str(base_dir / "catalogo_completo.csv"),
        help="Arquivo de saida CSV consolidado.",
    )
    args = parser.parse_args()

    pasta_csv = Path(args.input_dir)
    output_json = Path(args.json_output)
    output_csv = Path(args.csv_output)

    df_completo = carregar_catalogo(pasta_csv)
    exportar_catalogo(df_completo, output_json, output_csv)

    print(f"Total de produtos unificados e processados: {len(df_completo)}")
    print(f"JSON gerado em: {output_json}")
    print(f"CSV gerado em: {output_csv}")


if __name__ == "__main__":
    main()