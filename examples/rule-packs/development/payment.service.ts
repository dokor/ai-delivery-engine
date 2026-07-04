// development/service-size — a service kept small and focused.
// ADE warns (not errors) when a service exceeds thresholds.serviceMaxLines
// (default 250); the threshold is a refactoring recommendation, not a hard rule.

export interface PaymentRequest {
  amount: number;
  currency: string;
}

export class PaymentService {
  charge(request: PaymentRequest): { ok: boolean } {
    if (request.amount <= 0) {
      return { ok: false };
    }
    // Delegate persistence and gateway calls to collaborators instead of
    // growing this class — that keeps it under the size threshold.
    return { ok: true };
  }
}
