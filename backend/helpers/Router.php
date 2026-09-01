<?php

class Router
{
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler): void
    {
        $regex = preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $pattern);
        $this->routes[] = ['method' => $method, 'regex' => "#^{$regex}\$#", 'handler' => $handler];
    }

    public function dispatch(string $method, string $path): bool
    {
        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }
            if (preg_match($route['regex'], $path, $matches)) {
                $params = array_filter($matches, fn($k) => !is_int($k), ARRAY_FILTER_USE_KEY);
                call_user_func($route['handler'], $params);
                return true;
            }
        }
        return false;
    }
}
