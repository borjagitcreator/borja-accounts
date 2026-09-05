class DomainError(Exception):
    """Base de los errores de dominio. La capa de interfaz los traduce a
    JSON + status_code manteniendo el mismo contrato que hoy expone la API."""
    status_code = 400


class InvalidAmountError(DomainError):
    pass


class InvalidDateError(DomainError):
    pass


class InvalidMovementTypeError(DomainError):
    pass


class EmptyConceptError(DomainError):
    pass


class MissingSourceMovementError(DomainError):
    pass


class AlreadyClosedBetError(DomainError):
    pass


class ProtectedInitialBalanceError(DomainError):
    pass


class MovementNotFoundError(DomainError):
    status_code = 404


class InvalidTransferError(DomainError):
    pass


class InvalidMovementIndexError(DomainError):
    pass
