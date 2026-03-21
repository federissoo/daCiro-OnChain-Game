per ogni sessione
10.000 token in (circa)
1000 token out (circa)

costo haiku 4.5
- base in tokens = $1 / MTok
- out token = $5 / MTok

costo sonnet 4.6
- base in tokens = $3 / MTok
- out token = $15 / MTok

se scaglioni 
| Vault Size | Session Fee (~USD) |
|---|---|
| < 0.01 ETH | ~$0.025 |
| < 0.05 ETH | ~$0.125 |
| < 0.1 ETH  | ~$0.25  |
| < 0.5 ETH  | ~$2.50  |
| < 0.75 ETH | ~$6.25  | 
| < 1 ETH    | ~$12.50 |
| ≥ 1 ETH    | ~$25    |

calcola i guadagni (30% della fee) e le spese delle chiamate api per sessione per ogni scaglione del vault, sia per entrambi haiku sia per haiku+sonnet

Con 10.000 input / 1.000 output:

```
Haiku 4.5 + Haiku 4.5:
  Input:  10.000 × $1/MTok  = $0.010
  Output: 1.000  × $5/MTok  = $0.005
  Totale: $0.015

Haiku 4.5 + Sonnet 4.6:
  Input:  10.000 × $3/MTok  = $0.030
  Output: 1.000  × $15/MTok = $0.015
  Totale: $0.045
```

**Tabella aggiornata:**

| Vault | Fee | Dev 30% | Haiku+Haiku | Margine | Haiku+Sonnet | Margine |
|---|---|---|---|---|---|---|
| < 0.01 ETH | $0.025 | $0.0075 | $0.015 | **-$0.007** | $0.045 | **-$0.037** |
| < 0.05 ETH | $0.125 | $0.0375 | $0.015 | **+$0.022** | $0.045 | **-$0.007** |
| < 0.1 ETH | $0.25 | $0.075 | $0.015 | **+$0.060** | $0.045 | **+$0.030** |
| < 0.5 ETH | $2.50 | $0.75 | $0.015 | **+$0.735** | $0.045 | **+$0.705** |
| < 0.75 ETH | $6.25 | $1.875 | $0.015 | **+$1.860** | $0.045 | **+$1.830** |
| < 1 ETH | $12.50 | $3.75 | $0.015 | **+$3.735** | $0.045 | **+$3.705** |
| ≥ 1 ETH | $25 | $7.50 | $0.015 | **+$7.485** | $0.045 | **+$7.455** |

**Conclusioni aggiornate:**
- **Haiku+Haiku** → pareggio dal secondo scaglione (vault > 0.01 ETH)
- **Haiku+Sonnet** → pareggio dal terzo scaglione (vault > 0.1 ETH)