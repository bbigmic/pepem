'use client';

import { FC, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import { useLanguage } from '@/i18n/LanguageContext';

// Dynamiczny import komponentu portfela
const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

interface Props {
  onPaymentComplete: () => void;
  isContinuePayment?: boolean; // Nowy prop dla rozróżnienia typu płatności
}

const SPL_TOKEN_ADDRESS = 'J3D728v2apramx6UydCVHfKtBC7wfKmc1YUHJJ6Ppump';
const RECIPIENT_ADDRESS = '86kXaTTKGg9GmfH2Gr1syACs2SXEoyostL2bL7E19oV8';
const PAYMENT_AMOUNT = 1000000; // 1M tokenów
const PAYMENT_AMOUNT_FOR_CONTINUE = 500000; // 0.5M tokenów dla kontynuacji
const TOKEN_DECIMALS = 6; // standardowa liczba miejsc dziesiętnych dla tokenów PEPEM

// Używamy endpointu Alchemy
const RPC_ENDPOINT = 'https://solana-mainnet.g.alchemy.com/v2/jpJwZVUI4FlCf1IWtaVAjq6Lj2ABh7tv';

export const PaymentButton: FC<Props> = ({ onPaymentComplete, isContinuePayment = false }) => {
  const { publicKey, sendTransaction } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [isWaitingForConfirmation, setIsWaitingForConfirmation] = useState(false);
  const { t } = useLanguage();

  // Inicjalizacja połączenia
  useEffect(() => {
    const newConnection = new Connection(RPC_ENDPOINT, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
      disableRetryOnRateLimit: true,
      httpHeaders: {
        'Content-Type': 'application/json',
      },
    });

    // Wyciszamy błędy WebSocket dla tego połączenia
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (args[0]?.includes?.('ws error')) {
        return;
      }
      originalConsoleError.apply(console, args);
    };

    setConnection(newConnection);

    return () => {
      // Przywracamy oryginalną funkcję console.error
      console.error = originalConsoleError;
      setConnection(null);
    };
  }, [publicKey]);

  const handlePayment = async () => {
    if (!publicKey || !connection) {
      setError(t('noConnection'));
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const tokenMint = new PublicKey(SPL_TOKEN_ADDRESS);
      const recipient = new PublicKey(RECIPIENT_ADDRESS);

      // Get token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        publicKey
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        recipient
      );

      // Calculate amount with decimals - różne kwoty dla różnych typów płatności
      const paymentAmount = isContinuePayment ? PAYMENT_AMOUNT_FOR_CONTINUE : PAYMENT_AMOUNT;
      const amountWithDecimals = paymentAmount * Math.pow(10, TOKEN_DECIMALS);

      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        publicKey,
        amountWithDecimals
      );

      // Create and send transaction
      const transaction = new Transaction().add(transferInstruction);
      
      // Pobieramy najnowszy blockhash przed wysłaniem transakcji
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;

      console.log('Sending transaction with blockhash:', blockhash);
      const signature = await sendTransaction(transaction, connection);
      
      try {
        console.log('Transaction sent, signature:', signature);
        console.log('Waiting for confirmation...');
        setIsWaitingForConfirmation(true);
        
        // Najpierw sprawdzamy status transakcji
        const status = await connection.getSignatureStatus(signature);
        console.log('Initial transaction status:', status);

        // Sprawdzamy czy transakcja jest już w historii
        const tx = await connection.getTransaction(signature, {
          maxSupportedTransactionVersion: 0
        });

        if (tx) {
          console.log('Transaction already confirmed in history');
          onPaymentComplete();
          return;
        }

        // Jeśli nie ma w historii, czekamy na potwierdzenie
        try {
          const confirmation = await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight
          }, 'finalized');

          console.log('Transaction confirmation:', confirmation);

          if (confirmation.value.err) {
            throw new Error('Transaction failed: ' + confirmation.value.err);
          }

          // Sprawdzamy czy transakcja została faktycznie potwierdzona
          const finalStatus = await connection.getSignatureStatus(signature, {
            searchTransactionHistory: true
          });
          console.log('Final transaction status:', finalStatus);

          if (finalStatus.value?.confirmationStatus === 'confirmed' || finalStatus.value?.confirmationStatus === 'finalized') {
            console.log('Transaction successfully confirmed!');
            setIsWaitingForConfirmation(false);
            onPaymentComplete();
          } else {
            // Sprawdzamy historię transakcji jeszcze raz
            const finalTx = await connection.getTransaction(signature, {
              maxSupportedTransactionVersion: 0
            });
            console.log('Final transaction details:', finalTx);
            
            if (finalTx?.meta?.err) {
              throw new Error('Transaction failed: ' + finalTx.meta.err);
            }
            
            if (finalTx) {
              console.log('Transaction found in history, considering it confirmed');
              onPaymentComplete();
            } else {
              throw new Error('Transaction not confirmed properly');
            }
          }
        } catch (confirmError) {
          // Sprawdzamy historię transakcji w przypadku błędu
          const errorTx = await connection.getTransaction(signature, {
            maxSupportedTransactionVersion: 0
          });
          
          if (errorTx) {
            console.log('Transaction found in history despite confirmation error');
            onPaymentComplete();
            return;
          }
          
          throw confirmError;
        }
      } catch (error) {
        console.error('Transaction error:', error);
        setIsWaitingForConfirmation(false);
        
        // Sprawdzamy historię transakcji jeszcze raz
        try {
          const finalTx = await connection.getTransaction(signature, {
            maxSupportedTransactionVersion: 0
          });
          
          if (finalTx) {
            console.log('Transaction found in history despite error');
            onPaymentComplete();
            return;
          }
        } catch (statusError) {
          console.error('Error checking final transaction status:', statusError);
        }

        if ((error as Error).message?.includes('block height exceeded')) {
          setError(t('transactionExpired'));
        } else {
          setError(t('paymentError').replace('{message}', (error as Error).message));
        }
      } finally {
        setIsProcessing(false);
        setIsWaitingForConfirmation(false);
      }
    } catch (error: unknown) {
      console.error('Payment error:', error);
      setIsWaitingForConfirmation(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage?.includes('User rejected')) {
        setError(t('transactionRejected'));
      } else if (errorMessage?.includes('403')) {
        setError(t('networkError'));
      } else {
        setError(t('paymentError').replace('{message}', errorMessage));
      }
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <WalletMultiButton className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105" />
      
      {publicKey && (
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePayment}
            disabled={isProcessing || isWaitingForConfirmation}
            className={`px-8 py-3 rounded-xl text-white font-medium transition-all duration-300 transform hover:scale-105 ${
              isProcessing || isWaitingForConfirmation
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isProcessing || isWaitingForConfirmation ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>{isWaitingForConfirmation ? t('transactionSent') : t('processing')}</span>
              </div>
            ) : (
              t('payWithSPL')
            )}
          </button>
          <button
            onClick={() => window.open('https://pump.fun/coin/J3D728v2apramx6UydCVHfKtBC7wfKmc1YUHJJ6Ppump', '_blank')}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105"
          >
            {t('buyDevToken')}
          </button>
        </div>
      )}
      
      {error && (
        <div className="text-red-500 text-center max-w-md">
          {error}
        </div>
      )}
    </div>
  );
}; 