using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace MarketPulse.Infrastructure.Services;

/// <summary>
/// Custom HTTP message handler that fixes the 'utf8' charset issue from Adzuna API
/// by normalizing it to 'utf-8' before HttpClient's logging middleware processes it
/// </summary>
public class AdzunaHttpMessageHandler : DelegatingHandler
{
    public AdzunaHttpMessageHandler() : base(new HttpClientHandler())
    {
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var response = await base.SendAsync(request, cancellationToken);

        // Fix the Content-Type header if it contains 'utf8' instead of 'utf-8'
        if (response.Content?.Headers?.ContentType != null)
        {
            var contentType = response.Content.Headers.ContentType.ToString();
            if (contentType.Contains("charset=utf8") && !contentType.Contains("charset=utf-8"))
            {
                // Replace 'utf8' with 'utf-8' in the Content-Type header
                var fixedContentType = contentType.Replace("charset=utf8", "charset=utf-8");
                response.Content.Headers.ContentType = System.Net.Http.Headers.MediaTypeHeaderValue.Parse(fixedContentType);
            }
        }

        return response;
    }
}
