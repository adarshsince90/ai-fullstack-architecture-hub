using Microsoft.AspNetCore.Mvc;

namespace CleanArchitectureWebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly ITelemetryMetricsService _telemetry;

    public UsersController(IUserRepository userRepository, ITelemetryMetricsService telemetry)
    {
        _userRepository = userRepository;
        _telemetry = telemetry;
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUserByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        _telemetry.RecordRequest();

        // Pass CancellationToken downstream to cancel database / network calls when client disconnects
        var user = await _userRepository.FindByIdAsync(id, cancellationToken);
        if (user is null)
        {
            return NotFound(new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "User Not Found",
                Detail = $"No user exists with the identifier '{id}'."
            });
        }

        return Ok(new UserResponse(user.Id, user.Email, user.FullName, user.CreatedAtUtc));
    }

    [HttpPost]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateUserAsync([FromBody] CreateUserRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var newUser = new UserModel(Guid.NewGuid(), request.Email, request.FullName, DateTime.UtcNow);
        await _userRepository.SaveAsync(newUser, cancellationToken);

        return CreatedAtAction(nameof(GetUserByIdAsync), new { id = newUser.Id }, new UserResponse(newUser.Id, newUser.Email, newUser.FullName, newUser.CreatedAtUtc));
    }
}

public record CreateUserRequest(string Email, string FullName);
public record UserResponse(Guid Id, string Email, string FullName, DateTime CreatedAtUtc);
public record UserModel(Guid Id, string Email, string FullName, DateTime CreatedAtUtc);

public interface IUserRepository
{
    Task<UserModel?> FindByIdAsync(Guid id, CancellationToken ct);
    Task SaveAsync(UserModel user, CancellationToken ct);
}

public interface ITelemetryMetricsService
{
    void RecordRequest();
}
