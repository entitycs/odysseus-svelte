class ResearchPathNotFoundError(Exception):
    """No research path exists for this session."""

class ResearchPathNotOwnedError(Exception):
    """Path exists but belongs to a different user."""
    def __init__(self, session_id: str, owner: str, user: str):
        self.session_id = session_id
        self.owner = owner
        self.user = user
        super().__init__(f"Session {session_id!r} is not owned by {user!r}")
